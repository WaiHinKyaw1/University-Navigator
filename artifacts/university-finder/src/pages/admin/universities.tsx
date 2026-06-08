import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useListUniversities, useDeleteUniversity, useCreateUniversity, useUpdateUniversity } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminUniversities() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useListUniversities({
    search: search || undefined
  });

  const deleteMutation = useDeleteUniversity({
    mutation: {
      onSuccess: () => {
        toast.success("University deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["/api/universities"] });
      },
      onError: (err) => {
        toast.error(err.message || "Failed to delete university");
      }
    }
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this university?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Universities</h1>
            <p className="text-muted-foreground">Manage the directory of universities.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9 bg-card"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add New
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Min Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : response?.universities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No universities found.</TableCell>
                  </TableRow>
                ) : (
                  response?.universities.map((uni) => (
                    <TableRow key={uni.id}>
                      <TableCell>
                        <div className="font-medium">{uni.name}</div>
                        <div className="text-xs text-muted-foreground">{uni.nameEn}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{uni.type}</Badge>
                      </TableCell>
                      <TableCell>{uni.city ? `${uni.city}, ` : ''}{uni.state}</TableCell>
                      <TableCell>{uni.minScore}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(uni.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}