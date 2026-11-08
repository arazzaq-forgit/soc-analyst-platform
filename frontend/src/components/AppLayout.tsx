import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-base text-fg">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
