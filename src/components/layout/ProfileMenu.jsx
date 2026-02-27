import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/SupabaseAuthContext";

// Se você tiver shadcn DropdownMenu no projeto, use isso:
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function safe(v) {
  return String(v ?? "").trim();
}

export default function ProfileMenu() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth(); // ✅ assumindo que seu contexto tem signOut()

  const name = safe(user?.name || user?.nome || user?.user_metadata?.name || user?.email || "Usuário");
  const role = safe(user?.role || user?.user_metadata?.role);
  const roleLabel = role === "admin" ? "Administrador" : "Vendedor";

  const initial = useMemo(() => (name ? name[0].toUpperCase() : "U"), [name]);

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-2xl border border-white/10 bg-white/5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-full bg-sky-500/80 flex items-center justify-center text-slate-950 font-bold">
          {initial}
        </div>

        <div className="min-w-0">
          <div className="text-slate-100 font-semibold truncate">{name}</div>
          <div className="text-slate-400 text-sm truncate">{roleLabel}</div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 w-9 p-0 text-slate-300 hover:text-slate-100">
            <ChevronDown className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="glass-effect border-white/20 text-white" align="end">
          <DropdownMenuItem onClick={() => navigate("/perfil")} className="cursor-pointer">
            <User className="w-4 h-4 mr-2" />
            Meu perfil
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={async () => {
              try {
                await signOut?.();
              } finally {
                navigate("/login");
              }
            }}
            className="cursor-pointer text-red-300 focus:text-red-200"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}