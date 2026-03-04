import React from "react";
import axios from "axios";
import { useData } from "@/contexts/SupabaseDataContext";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ClientForm from "@/components/clients/ClientForm";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet";

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

function inferTypeTxIdFromDoc(cpfCnpj) {
  const d = onlyDigits(cpfCnpj);
  if (d.length === 14) return 1; // CNPJ
  if (d.length === 11) return 2; // CPF
  return null;
}

function mapFormToVoallePayload(formData) {
  const documento = formData.cpf_cnpj ?? "";
  const txId = onlyDigits(documento);

  const typeTxId =
    formData.tipo_pessoa === "PJ" ? 1 :
    formData.tipo_pessoa === "PF" ? 2 :
    null;

  if (!typeTxId) {
    throw new Error("Tipo de pessoa inválido.");
  }

  if (typeTxId === 2 && txId.length !== 11)
    throw new Error("CPF deve ter 11 dígitos.");

  if (typeTxId === 1 && txId.length !== 14)
    throw new Error("CNPJ deve ter 14 dígitos.");

  const enderecoPrincipal = formData.enderecos?.[0] ?? {};

  return {
    typeTxId,
    txId,
    name: formData.nome_razao ?? "",
    email: formData.email ?? "",
    client: true,
    situation: 1,

    streetType: "Rua",
    postalCode: onlyDigits(enderecoPrincipal.cep ?? ""),
    street: enderecoPrincipal.logradouro ?? "",
    number: String(enderecoPrincipal.numero ?? ""),
    addressComplement: enderecoPrincipal.complemento ?? "",
    addressReference: "",
    neighborhood: enderecoPrincipal.bairro ?? "",
    city: enderecoPrincipal.cidade ?? "",
    codeCityId: null,
    state: enderecoPrincipal.uf ?? "",
    codeCountry: "BR"
  };
}
function ClientFormPage() {
  const { clients, addClient } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const clientToEdit = isEditing ? clients.find((c) => c.id === id) : null;

  const handleSave = async (formData) => {
    try {
      // 1) envia para o Voalle via BFF
      const payload = mapFormToVoallePayload(formData);

      const resp = await axios.post("/api/voalle/people", payload);

      // Voalle costuma retornar { success, messages: [...] }
      if (resp?.data?.success === false) {
        const msg = resp.data?.messages?.[0]?.message || "Erro ao cadastrar no Voalle";
        throw new Error(msg);
      }

      // 2) opcional: salva também no Supabase (mantém sua tela funcionando como hoje)
      addClient(formData);

      const msgOk = resp.data?.messages?.[0]?.message || (isEditing ? "Cliente atualizado!" : "Cliente cadastrado!");
      toast({ title: msgOk, description: "Os dados foram salvos com sucesso." });

      navigate("/clientes");
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error?.message || "Falha ao salvar cliente"
      });
    }
  };

  const handleCancel = () => {
    navigate("/clientes");
  };

  const pageTitle = `${isEditing ? "Editar Cliente" : "Novo Cliente"} | ONDA+`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={handleCancel} className="text-slate-400 hover:text-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-100">{isEditing ? "Editar Cliente" : "Novo Cliente"}</h1>
          <p className="text-slate-400">{clientToEdit?.nome_razao || "Preencha os dados do cliente"}</p>
        </div>
      </div>

      <div className="floating-card p-6 md:p-8">
        <ClientForm client={clientToEdit} onSave={handleSave} onCancel={handleCancel} />
      </div>
    </div>
  );
}

export default ClientFormPage;