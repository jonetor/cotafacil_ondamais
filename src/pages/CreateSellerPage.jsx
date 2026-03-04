import React, { useState } from "react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { bffFetch } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

export default function CreateSellerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  if (user?.email !== "admin@ondamais.ai") {
    return <div className="p-6 text-red-500">Acesso restrito.</div>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await bffFetch("/api/auth/create-seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      toast({
        title: "Vendedor criado!",
        description: "Usuário cadastrado com sucesso.",
      });

      navigate("/vendedores");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: err.message,
      });
    }
  };

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-xl font-bold mb-4">Novo Vendedor</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          placeholder="Nome"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <Input
          placeholder="Senha"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        <Button type="submit">Criar Vendedor</Button>
      </form>
    </div>
  );
}