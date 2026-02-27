import React, { useMemo, useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Building,
  Users2,
  Package,
  FileText,
  UserCircle,
  Users,
  History,
  Settings as SettingsIcon,
  LogOut,
  ChevronDown,
  Menu,
  Calculator,
  Link as LinkIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";

const adminLinks = [
  { to: "/auditoria", icon: History, text: "Auditoria" },
  {
    to: "/configuracoes",
    icon: SettingsIcon,
    text: "Configurações",
    submenu: [{ to: "/api-integration", icon: LinkIcon, text: "Integração de API via HTTPS" }],
  },
];

const NavItem = ({ to, icon: Icon, text, onClick, submenu }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);

  useEffect(() => {
    if (submenu) {
      const hasActiveSubmenu = submenu.some((item) => location.pathname.startsWith(item.to));
      setIsSubmenuOpen(hasActiveSubmenu || isActive);
    }
  }, [location.pathname, submenu, isActive]);

  if (submenu) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
          className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative ${
            isActive ? "bg-blue-600/20 text-blue-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
          }`}
        >
          <div
            className={`absolute left-0 top-0 h-full w-1 rounded-r-full bg-blue-400 transition-transform duration-300 ease-in-out ${
              isActive ? "scale-y-100" : "scale-y-0"
            }`}
          />
          <Icon className="w-5 h-5 mr-3" />
          <span className="flex-grow text-left">{text}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isSubmenuOpen ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {isSubmenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-4 mt-1 space-y-1 border-l border-slate-700/50 pl-4">
                {submenu.map((subItem) => {
                  const isSubActive = location.pathname.startsWith(subItem.to);
                  return (
                    <NavLink
                      key={subItem.to}
                      to={subItem.to}
                      onClick={onClick}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isSubActive
                          ? "bg-blue-600/20 text-blue-300"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      }`}
                    >
                      <subItem.icon className="w-4 h-4 mr-2" />
                      <span>{subItem.text}</span>
                    </NavLink>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative ${
        isActive ? "bg-blue-600/20 text-blue-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
      }`}
    >
      <div
        className={`absolute left-0 top-0 h-full w-1 rounded-r-full bg-blue-400 transition-transform duration-300 ease-in-out ${
          isActive ? "scale-y-100" : "scale-y-0"
        }`}
      />
      <Icon className="w-5 h-5 mr-3" />
      <span>{text}</span>
    </NavLink>
  );
};

const UserMenu = () => {
  const { user, signOut } = useAuth();
  if (!user) return null;

  // ✅ BFF user esperado: { sub, email, role, name }
  // fallback: supabase-like: user_metadata
  const nameFromBff = user?.name;
  const emailFromBff = user?.email;

  const metaName = user?.user_metadata?.name;
  const metaRole = user?.user_metadata?.role;

  const userName = nameFromBff || metaName || emailFromBff || user?.email || "Usuário";
  const roleRaw = user?.role || metaRole || "seller";
  const userRole = roleRaw === "admin" ? "Administrador" : "Vendedor";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center w-full text-left p-2 rounded-lg hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mr-3 flex-shrink-0">
          <span className="text-slate-900 font-bold text-lg">{String(userName).charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-grow hidden lg:block">
          <p className="text-sm font-semibold text-slate-200 truncate">{userName}</p>
          <p className="text-xs text-slate-400">{userRole}</p>
        </div>
        <ChevronDown className="h-5 w-5 text-slate-400 hidden lg:block" />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56 glass-effect border-slate-700 text-slate-200" align="end">
        <DropdownMenuItem disabled>
          <div className="lg:hidden">
            <p className="text-sm font-semibold text-slate-200 truncate">{userName}</p>
            <p className="text-xs text-slate-400">{userRole}</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={signOut}
          className="cursor-pointer hover:!bg-red-600/30 focus:!bg-red-600/40 text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const SidebarContent = ({ onLinkClick }) => {
  const { user } = useAuth();

  // ✅ Admin: role=admin OU email admin@ondamais.ai
  const isAdmin = user?.role === "admin" || user?.email === "admin@ondamais.ai";

  // ✅ monta nav dinamicamente (Vendedores só admin)
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

    base.push(
      { to: "/usuarios", icon: Users, text: "Usuários" },
      { to: "/fiscal", icon: Calculator, text: "Fiscal" }
    );

    return base;
  }, [isAdmin]);

  return (
    <div className="w-64 bg-sidebar flex flex-col p-4 border-r border-slate-800/50 h-full">
      <div className="text-3xl font-bold text-slate-200 mb-10 ml-4 flex items-center">
        ONDA<span className="text-blue-400">+</span>
      </div>

      <nav className="flex-grow space-y-2">
        {navLinks.map((link) => (
          <NavItem key={link.to} {...link} onClick={onLinkClick} />
        ))}

        {/* Administração (mantive como você tinha) */}
        <div className="pt-4 mt-4 border-t border-slate-700/50">
          <h3 className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Administração</h3>
          <div className="space-y-2 mt-2">
            {adminLinks.map((link) => (
              <NavItem key={link.to} {...link} onClick={onLinkClick} />
            ))}
          </div>
        </div>
      </nav>

      <div className="mt-auto">
        <div className="hidden lg:block">
          <UserMenu />
        </div>
        <div className="hidden lg:block text-center text-xs text-slate-500 mt-4 px-2">
          <p>Versão 1.0</p>
          <p>Desenvolvido por Diones Sampaio</p>
        </div>
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
    <div className="flex h-screen bg-app-background">
      <div className="hidden lg:flex lg:flex-shrink-0">
        <SidebarContent />
      </div>

      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/60 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 h-full z-40 lg:hidden"
            >
              <SidebarContent onLinkClick={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800/50 bg-sidebar">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-300 hover:text-white" type="button">
            <Menu className="h-6 w-6" />
          </button>
          <div className="text-2xl font-bold text-slate-200">
            ONDA<span className="text-blue-400">+</span>
          </div>
          <UserMenu />
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto bg-app-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;