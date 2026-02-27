import React, { useMemo, useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Building,
  Users2,
  Package,
  FileText,
  UserCircle,
  History,
  LogOut,
  ChevronDown,
  Menu,
  Calculator,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";

/* ✅ Admin links (Configurações removido; Auditoria só para admin) */
const adminLinks = [{ to: "/auditoria", icon: History, text: "Auditoria" }];

const NavItem = ({ to, icon: Icon, text, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
        isActive
          ? "bg-blue-600/20 text-blue-300"
          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
      }`}
    >
      <Icon className="w-5 h-5 mr-3" />
      {text}
    </NavLink>
  );
};

const UserMenu = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const nameFromBff = user?.name;
  const emailFromBff = user?.email;
  const metaName = user?.user_metadata?.name;
  const metaRole = user?.user_metadata?.role;

  const userName = nameFromBff || metaName || emailFromBff || user?.email || "Usuário";
  const roleRaw = user?.role || metaRole || "seller";
  const userRole = roleRaw === "admin" ? "Administrador" : "Vendedor";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-sky-500/80 flex items-center justify-center text-slate-950 font-bold">
              {String(userName).charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 text-left">
              <div className="text-slate-100 font-semibold truncate">{userName}</div>
              <div className="text-slate-400 text-sm truncate">{userRole}</div>
            </div>
          </div>

          <ChevronDown className="w-5 h-5 text-slate-300" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="glass-effect border-white/20 text-white w-56" align="start">
        <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/perfil")}>
          <UserIcon className="w-4 h-4 mr-2" />
          Meu perfil
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer text-red-300 focus:text-red-200"
          onClick={async () => {
            try {
              await signOut?.();
            } finally {
              navigate("/login");
            }
          }}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const SidebarContent = ({ onLinkClick }) => {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin" || user?.email === "admin@ondamais.ai";

  const navLinks = useMemo(() => {
    const base = [
      { to: "/dashboard", icon: LayoutGrid, text: "Dashboard" },
      { to: "/empresas", icon: Building, text: "Empresas" },
      { to: "/clientes", icon: Users2, text: "Clientes" },
      { to: "/produtos", icon: Package, text: "Produtos" },
      { to: "/cotacoes", icon: FileText, text: "Cotações" },
    ];

    if (isAdmin) {
      base.push({ to: "/vendedores", icon: UserCircle, text: "Vendedores" });
    }

    // ✅ REMOVIDO: /usuarios
    base.push({ to: "/fiscal", icon: Calculator, text: "Fiscal" });

    return base;
  }, [isAdmin]);

  const adminLinksToShow = isAdmin ? adminLinks : [];

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-5">
        <div className="text-xl font-bold text-white">ONDA+</div>
      </div>

      <nav className="px-3 space-y-1 flex-1 overflow-y-auto">
        {navLinks.map((link) => (
          <NavItem key={link.to} {...link} onClick={onLinkClick} />
        ))}

        {adminLinksToShow.length > 0 && (
          <div className="pt-4">
            <div className="px-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Administração
            </div>
            <div className="mt-2 space-y-1">
              {adminLinksToShow.map((link) => (
                <NavItem key={link.to} {...link} onClick={onLinkClick} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* ✅ UserMenu embaixo */}
      <div className="px-3 pb-3">
        <UserMenu />
      </div>

      <div className="px-4 py-4 text-xs text-slate-500">
        <div>Versão 1.0</div>
        <div>Desenvolvido por Diones Sampaio</div>
      </div>
    </div>
  );
};

const Layout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-app-background flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:block w-72 border-r border-white/10">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-app-background border-r border-white/10 z-50 md:hidden"
            >
              <SidebarContent onLinkClick={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Conteúdo */}
      <main className="flex-1 min-w-0">
        <div className="md:hidden p-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-300 hover:text-white"
            type="button"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;