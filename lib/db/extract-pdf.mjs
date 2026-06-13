import { readFileSync, writeFileSync } from 'fs';
import { inflateSync, inflateRawSync } from 'zlib';

const pdfPath = 'C:\\Users\\ASUS\\Downloads\\Telegram Desktop\\University_Admission_Guide_2025.pdf';
const buf = readFileSync(pdfPath);
const raw = buf.toString('latin1');

console.log('PDF size:', buf.length, 'bytes');

// Find all streams and try to decompress them
const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
let match;
let streamCount = 0;
const allTexts = [];

while ((match = streamRegex.exec(raw)) !== null) {
  streamCount++;
  const streamData = match[1];
  const streamBuf = Buffer.from(streamData, 'latin1');
  
  let decompressed = null;
  
  // Try inflate (FlateDecode)
  try {
    decompressed = inflateSync(streamBuf);
  } catch (e) {
    try {
      decompressed = inflateRawSync(streamBuf);
    } catch (e2) {
      // Not compressed or different compression
      decompressed = streamBuf;
    }
  }
  
  if (decompressed) {
    const text = decompressed.toString('utf8');
    
    // Extract text from BT...ET blocks
    const btEtRegex = /BT\s([\s\S]*?)ET/g;
    let btMatch;
    while ((btMatch = btEtRegex.exec(text)) !== null) {
      const block = btMatch[1];
      
      // Tj operator
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        const decoded = tjMatch[1].replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
        if (decoded.trim()) allTexts.push(decoded);
      }
      
      // TJ arrays
      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      let tjArrMatch;
      while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
        const arrContent = tjArrMatch[1];
        const strRegex = /\(([^)]*)\)/g;
        let strMatch;
        const parts = [];
        while ((strMatch = strRegex.exec(arrContent)) !== null) {
          parts.push(strMatch[1]);
        }
        const line = parts.join('');
        if (line.trim()) allTexts.push(line);
      }
      
      // Hex strings with Tj
      const hexTjRegex = /<([0-9A-Fa-f]+)>\s*Tj/g;
      let hexMatch;
      while ((hexMatch = hexTjRegex.exec(block)) !== null) {
        const hex = hexMatch[1];
        let decoded = '';
        for (let i = 0; i < hex.length; i += 4) {
          const code = parseInt(hex.substring(i, i + 4), 16);
          if (code > 0) decoded += String.fromCharCode(code);
        }
        if (decoded.trim()) allTexts.push(decoded);
      }
      
      // Hex strings in TJ arrays
      const hexTJRegex = /\[(.*?)\]\s*TJ/g;
      let hexTJMatch;
      while ((hexTJMatch = hexTJRegex.exec(block)) !== null) {
        const content = hexTJMatch[1];
        const hexStrRegex = /<([0-9A-Fa-f]+)>/g;
        let hMatch;
        const parts = [];
        while ((hMatch = hexStrRegex.exec(content)) !== null) {
          const hex = hMatch[1];
          let decoded = '';
          for (let i = 0; i < hex.length; i += 4) {
            const code = parseInt(hex.substring(i, i + 4), 16);
            if (code > 0) decoded += String.fromCharCode(code);
          }
          parts.push(decoded);
        }
        const line = parts.join('');
        if (line.trim()) allTexts.push(line);
      }
    }
  }
}

console.log('Found', streamCount, 'streams');
console.log('Extracted', allTexts.length, 'text segments');

const output = allTexts.join('\n');
writeFileSync('pdf-output.txt', output, 'utf8');
console.log('\n=== First 5000 chars ===');
console.log(output.substring(0, 5000));
