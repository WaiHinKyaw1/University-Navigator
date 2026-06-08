import { AdminLayout } from "@/components/admin-layout";
import { useListMajors, useDeleteMajor } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminMajors() {
  const queryClient = useQueryClient();
  const { data: majors, isLoading } = useListMajors();

  const deleteMutation = useDeleteMajor({
    mutation: {
      onSuccess: () => {
        toast.success("Major deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["/api/majors"] });
      },
      onError: (err) => {
        toast.error(err.message || "Failed to delete major");
      }
    }
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this major?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Majors</h1>
            <p className="text-muted-foreground">Manage academic fields of study.</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Add Major
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>English Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : !majors?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No majors found.</TableCell>
                  </TableRow>
                ) : (
                  majors.map((major) => (
                    <TableRow key={major.id}>
                      <TableCell className="font-medium">{major.name}</TableCell>
                      <TableCell>{major.nameEn}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{major.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(major.id)}
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