import React, { useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { motion, AnimatePresence } from "framer-motion";
import { Users as UsersIcon, Plus, Search, Edit, Trash2 } from "lucide-react";
import { useData } from "@/contexts/SupabaseDataContext";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import UserForm from "@/components/users/UserForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/customSupabaseClient";
import { useNavigate } from "react-router-dom";

const UsersPage = () => {
  const { users, addUser, deleteUser, sellers } = useData();
  const { signUp, user } = useAuth(); // ✅ pega user do contexto aqui dentro
  const { toast } = useToast();
  const navigate = useNavigate();

  const isAdmin = user?.email === "admin@ondamais.ai";

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null); // (mantido, mesmo não usado)
  const [searchTerm, setSearchTerm] = useState("");

  const usersWithDetails = useMemo(() => {
    return (users || []).map((u) => {
      const seller = (sellers || []).find((s) => s.id === u.seller_id);
      return {
        ...u,
        sellerName: seller?.nome || seller?.name || "N/A",
      };
    });
  }, [users, sellers]);

  const filteredUsers = useMemo(() => {
    if (!usersWithDetails) return [];
    return usersWithDetails.filter((u) => {
      const term = searchTerm.toLowerCase();
      return (
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.sellerName?.toLowerCase().includes(term)
      );
    });
  }, [usersWithDetails, searchTerm]);

  const handleNewUser = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleEditUser = (u) => {
    setEditingUser(u);
    setIsFormOpen(true);
  };

  const handleSaveUser = async (formData) => {
    const { password, ...userData } = formData;

    try {
      if (formData.id) {
        // Editing existing user
        if (password) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            formData.id,
            { password }
          );
          if (updateError) throw updateError;
        }

        await addUser(userData);
        toast({ title: "Usuário atualizado com sucesso!" });
      } else {
        // Creating new user
        const {
          data: { user: createdUser },
          error: signUpError,
        } = await signUp(userData.email, password, {
          data: {
            name: userData.name,
            role: userData.role,
          },
        });

        if (signUpError) throw signUpError;

        if (createdUser) {
          await addUser({
            id: createdUser.id,
            name: userData.name,
            role: userData.role,
            seller_id: userData.seller_id,
          });
        }

        toast({
          title: "Usuário criado com sucesso!",
          description: "Um e-mail de confirmação foi enviado.",
        });
      }

      setIsFormOpen(false);
      setEditingUser(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar usuário",
        description: error?.message || "Erro desconhecido",
      });
    }
  };

  const handleDelete = async (id, name) => {
    try {
      await deleteUser(id);
      toast({
        variant: "destructive",
        title: "Usuário removido!",
        description: `O usuário "${name}" foi removido do sistema.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao remover usuário",
        description: "Não foi possível remover o usuário. Contate o suporte.",
      });
    }

    setUserToDelete(null);
  };

  return (
    <div className="text-slate-200 min-h-full -m-8 p-8">
      <Helmet>
        <title>Usuários | ONDA+</title>
      </Helmet>

      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Usuários</h1>
              <p className="text-slate-400 mt-1">Gerencie os acessos à plataforma.</p>
            </div>

            <div className="flex gap-2">
              {/* ✅ botão exclusivo do admin */}
              {isAdmin && (
                <Button
                  variant="outline"
                  className="btn-secondary"
                  onClick={() => navigate("/usuarios/novo-vendedor")}
                >
                  Criar Novo Vendedor
                </Button>
              )}

              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-primary" onClick={handleNewUser}>
                    <Plus className="w-4 h-4 mr-2" /> Novo Usuário
                  </Button>
                </DialogTrigger>

                <DialogContent className="glass-effect border-slate-700 text-slate-200">
                  <DialogHeader>
                    <DialogTitle className="text-slate-100">
                      {editingUser ? "Editar Usuário" : "Novo Usuário"}
                    </DialogTitle>
                  </DialogHeader>

                  <UserForm
                    user={editingUser}
                    onSave={handleSaveUser}
                    onCancel={() => {
                      setIsFormOpen(false);
                      setEditingUser(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Buscar por nome, e-mail ou vendedor..."
            className="pl-10 w-full md:w-1/3 input-field"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="min-w-full text-sm text-slate-200">
            <thead className="bg-slate-800/60 text-slate-400">
              <tr>
                <th className="p-3 text-left font-semibold">Nome</th>
                <th className="p-3 text-left font-semibold">E-mail</th>
                <th className="p-3 text-left font-semibold">Vendedor Vinculado</th>
                <th className="p-3 text-center font-semibold">Perfil</th>
                <th className="p-3 w-32"></th>
              </tr>
            </thead>

            <tbody>
              <AnimatePresence>
                {filteredUsers.map((u) => (
                  <motion.tr
                    key={u.id}
                    className="border-t border-slate-800 hover:bg-slate-800/40 transition-colors"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <td className="p-3 font-medium text-slate-100">{u.name}</td>
                    <td className="p-3">{u.email || "Não definido"}</td>
                    <td className="p-3">{u.sellerName}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-x-1.5 px-2 py-1 text-xs font-medium rounded-full capitalize ${
                          u.role === "admin"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditUser(u)}
                          className="text-slate-400 hover:text-blue-400"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-slate-400 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent className="glass-effect border-slate-700 text-slate-200">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center text-slate-100">
                                <Trash2 className="w-5 h-5 mr-2 text-red-400" />
                                Confirmar Exclusão
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                Tem certeza que deseja excluir o usuário "{u.name}"? Esta ação
                                não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(u.id, u.name)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <UsersIcon className="w-16 h-16 mx-auto mb-4" />
              <h3 className="text-xl font-semibold">Nenhum usuário encontrado</h3>
              <p>Tente ajustar sua busca ou adicione um novo usuário.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersPage;