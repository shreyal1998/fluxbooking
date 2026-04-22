import Link from "next/link";
import { 
  Calendar, 
  Shield, 
  Users, 
  Zap, 
  ChevronRight, 
  Clock, 
  Star,
  CheckCircle2,
  ArrowRight,
  Plus,
  Settings,
  Scissors
} from "lucide-react";

const Twitter = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
);

const Linkedin = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect width="4" height="12" x="2" y="9"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

const Github = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.28 1.15-.28 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
);

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sticky Glass Header */}
      <header className="fixed top-0 w-full z-50 glass">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">FluxBooking</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors" href="#features">
              Features
            </Link>
            <Link className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors" href="#how-it-works">
              How it Works
            </Link>
            <Link className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors" href="/login">
              Login
            </Link>
            <Link
              href="/register"
              className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-slate-800 transition-all hover:shadow-xl hover:shadow-slate-200"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-8 lg:pt-48 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white">
          <div className="bg-grid absolute inset-0 opacity-[0.4] pointer-events-none"></div>
          
          <div className="container px-4 mx-auto relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">The Future of Booking is Here</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto leading-[1.1]">
              The Universal Booking System for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Every Business</span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-slate-500 text-lg md:text-xl mb-10 leading-relaxed">
              From salons to gyms, manage your staff, services, and bookings in one high-performance SaaS platform designed for growth.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-2xl bg-indigo-600 px-10 text-base font-bold text-white shadow-2xl shadow-indigo-500/20 transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-95"
              >
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white px-10 text-base font-bold text-slate-900 transition-all hover:bg-slate-50 hover:border-slate-300"
              >
                Watch Demo
              </Link>
            </div>

            {/* Mock UI Showcase - Matches actual system built */}
            <div className="relative max-w-5xl mx-auto px-4 sm:px-0 opacity-100">
              <div className="rounded-[2.5rem] border border-slate-200 bg-white p-3 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] overflow-hidden">
                <div className="rounded-[2rem] border border-slate-100 bg-[#F8FAFC] flex flex-col overflow-hidden">
                  {/* Mock Browser Header */}
                  <div className="h-12 bg-white border-b border-slate-200 flex items-center px-6 justify-between text-left">
                    <div className="flex gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#FF5F57] shadow-sm"></div>
                      <div className="h-3 w-3 rounded-full bg-[#FEBC2E] shadow-sm"></div>
                      <div className="h-3 w-3 rounded-full bg-[#28C840] shadow-sm"></div>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-4 py-1.5 text-[10px] font-bold text-slate-400 font-mono tracking-tight flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      fluxbooking.com/dashboard/appointments
                    </div>
                    <div className="w-12"></div>
                  </div>

                  <div className="flex-1 flex overflow-hidden min-h-[500px] text-left">
                    {/* Sidebar Mock - Matches internal Dashboard Shell */}
                    <div className="w-52 bg-white border-r border-slate-200 p-5 space-y-6 hidden md:block">
                       <div className="space-y-4">
                         <div className="px-2"><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Menu</p></div>
                         <div className="h-10 w-full bg-slate-50 rounded-xl flex items-center px-3 gap-3">
                            <Users className="h-4 w-4 text-slate-300" />
                            <span className="text-xs font-bold text-slate-400">Team</span>
                         </div>
                         <div className="h-10 w-full bg-slate-50 rounded-xl flex items-center px-3 gap-3">
                            <Scissors className="h-4 w-4 text-slate-300" />
                            <span className="text-xs font-bold text-slate-400">Services</span>
                         </div>
                         <div className="h-10 w-full bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 flex items-center px-3 gap-3">
                            <Calendar className="h-4 w-4" />
                            <span className="text-xs font-black">Appointments</span>
                         </div>
                         <div className="h-10 w-full bg-slate-50 rounded-xl flex items-center px-3 gap-3">
                            <Settings className="h-4 w-4 text-slate-300" />
                            <span className="text-xs font-bold text-slate-400">Settings</span>
                         </div>
                       </div>
                    </div>

                    {/* Content Mock - Matches Appointments Table system */}
                    <div className="flex-1 bg-white p-6 md:p-10 flex flex-col min-w-0">
                       <div className="flex justify-between items-end mb-10">
                         <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-900">Appointments</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Manage your schedule</p>
                         </div>
                         <button className="h-11 px-5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 text-white text-xs font-black flex items-center gap-2 hover:scale-105 transition-transform">
                            <Plus className="h-4 w-4" />
                            New Booking
                         </button>
                       </div>
                       
                       <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                          <table className="w-full">
                             <thead className="bg-slate-50 border-b border-slate-100 text-left">
                                <tr>
                                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Customer</th>
                                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</th>
                                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-50 text-left">
                                {[
                                  { date: "Oct 24, 2026", time: "10:30 AM", name: "Sarah Miller", service: "Hair Styling", status: "CONFIRMED", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
                                  { date: "Oct 24, 2026", time: "01:00 PM", name: "Alex Jones", service: "Personal Training", status: "PENDING", color: "text-amber-600 bg-amber-50 border-amber-100" },
                                  { date: "Oct 23, 2026", time: "04:15 PM", name: "David Wilson", service: "Full Body Spa", status: "COMPLETED", color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
                                  { date: "Oct 22, 2026", time: "09:00 AM", name: "Emma Thompson", service: "Manicure", status: "CONFIRMED", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
                                ].map((row, i) => (
                                  <tr key={i}>
                                     <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-slate-900">{row.date}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{row.time}</p>
                                     </td>
                                     <td className="px-6 py-4 hidden sm:table-cell">
                                        <p className="text-sm font-bold text-slate-900">{row.name}</p>
                                        <p className="text-[9px] text-slate-400 font-medium">sarah.m@example.com</p>
                                     </td>
                                     <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200">{row.service}</span>
                                     </td>
                                     <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border ${row.color}`}>{row.status}</span>
                                     </td>
                                  </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Accents */}
              <div className="absolute -top-6 -right-6 h-32 w-32 bg-indigo-600/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 h-40 w-40 bg-violet-600/20 rounded-full blur-3xl"></div>
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="py-24 bg-white relative overflow-hidden">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-3">Powerfully Simple</h2>
              <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Everything you need to scale</h3>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">Built by industry experts to eliminate scheduling headaches and maximize your revenue.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {/* Bento Card 1: Large Feature */}
              <div className="md:col-span-2 lg:col-span-2 bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all group overflow-hidden relative">
                <div className="relative z-10">
                  <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="text-2xl font-bold mb-3 text-slate-900">Instant Online Booking</h4>
                  <p className="text-slate-500 leading-relaxed mb-6">Give your customers a premium booking experience on any device. 24/7 access means you never miss a lead.</p>
                  <ul className="space-y-3">
                    {["Customizable Booking URL", "Mobile-Optimized Flow", "Instant Notifications"].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <CheckCircle2 className="h-4 w-4 text-indigo-500" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="absolute bottom-[-20%] right-[-10%] w-64 h-64 bg-indigo-200/20 rounded-full blur-3xl group-hover:bg-indigo-300/30 transition-colors"></div>
              </div>

              {/* Bento Card 2: Medium Feature */}
              <div className="md:col-span-1 lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-10 text-white hover:shadow-2xl hover:shadow-slate-500/10 transition-all group overflow-hidden relative">
                <div className="relative z-10">
                  <div className="h-12 w-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center mb-6">
                    <Users className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h4 className="text-2xl font-bold mb-3">Team Orchestration</h4>
                  <p className="text-slate-400 leading-relaxed">Manage staff schedules, services, and class capacities with surgical precision.</p>
                </div>
                {/* Visual Accent */}
                <div className="absolute bottom-10 right-10 flex gap-1 items-end">
                   <div className="w-3 h-8 bg-indigo-500 rounded-full"></div>
                   <div className="w-3 h-14 bg-indigo-400 rounded-full"></div>
                   <div className="w-3 h-10 bg-indigo-600 rounded-full"></div>
                </div>
              </div>

              {/* Bento Card 3: Small Feature */}
              <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all group">
                <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-6 group-hover:rotate-12 transition-transform">
                  <Clock className="h-6 w-6 text-indigo-600" />
                </div>
                <h4 className="text-xl font-bold mb-2 text-slate-900">Real-time Slots</h4>
                <p className="text-slate-500 text-sm">Automatic availability calculation prevents double bookings instantly.</p>
              </div>

              {/* Bento Card 4: Small Feature */}
              <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all group">
                <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-6 group-hover:rotate-12 transition-transform">
                  <Shield className="h-6 w-6 text-indigo-600" />
                </div>
                <h4 className="text-xl font-bold mb-2 text-slate-900">Enterprise Security</h4>
                <p className="text-slate-500 text-sm">Data isolation and encryption to keep your business data private.</p>
              </div>

              {/* Bento Card 5: Horizontal Medium Feature */}
              <div className="md:col-span-2 bg-indigo-50 rounded-[2.5rem] p-10 border border-indigo-100 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all flex flex-col md:flex-row items-center gap-8 group">
                <div className="flex-1 text-center md:text-left">
                  <h4 className="text-2xl font-bold mb-3 text-slate-900 tracking-tight">Growing with you</h4>
                  <p className="text-slate-600 font-medium leading-relaxed">From a single specialist to 50+ staff members, FluxBooking scales effortlessly as your business grows.</p>
                </div>
                <div className="flex flex-col items-center md:items-end gap-3">
                  <div className="flex -space-x-4">
                    {[
                      { name: "JD", bg: "bg-indigo-500" },
                      { name: "AS", bg: "bg-violet-500" },
                      { name: "MK", bg: "bg-blue-500" },
                      { name: "TL", bg: "bg-emerald-500" },
                    ].map((user, i) => (
                      <div 
                        key={i} 
                        className={`h-12 w-12 rounded-full border-4 border-white ${user.bg} flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-slate-200 transition-transform group-hover:translate-x-1`}
                        style={{ transitionDelay: `${i * 50}ms` }}
                      >
                        {user.name}
                      </div>
                    ))}
                    <div className="h-12 w-12 rounded-full border-4 border-white bg-white flex items-center justify-center text-[10px] font-black text-slate-400 shadow-lg shadow-slate-200">
                      +1k
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-sm font-black text-indigo-600 uppercase tracking-tighter">+500 Active Users</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 py-16">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2 space-y-6">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="bg-indigo-600 p-1.5 rounded-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-900">FluxBooking</span>
              </Link>
              <p className="text-slate-500 max-w-sm">The world's most versatile booking platform for growing businesses. Start managing your time better today.</p>
            </div>
            <div>
              <h5 className="font-bold text-slate-900 mb-6 uppercase text-xs tracking-widest">Platform</h5>
              <ul className="space-y-4 text-sm font-medium text-slate-500">
                <li><Link href="#" className="hover:text-indigo-600 transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-indigo-600 transition-colors">Pricing</Link></li>
                <li><Link href="/register" className="hover:text-indigo-600 transition-colors">Register</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-slate-900 mb-6 uppercase text-xs tracking-widest">Support</h5>
              <ul className="space-y-4 text-sm font-medium text-slate-500">
                <li><Link href="#" className="hover:text-indigo-600 transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-indigo-600 transition-colors">Contact</Link></li>
                <li><Link href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-200">
            <p className="text-xs text-slate-400 font-medium" suppressHydrationWarning>© 2026 FluxBooking SaaS. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
               <Link href="#" className="text-slate-400 hover:text-indigo-600 transition-colors">
                 <Twitter className="h-4 w-4" />
               </Link>
               <Link href="#" className="text-slate-400 hover:text-indigo-600 transition-colors">
                 <Linkedin className="h-4 w-4" />
               </Link>
               <Link href="#" className="text-slate-400 hover:text-indigo-600 transition-colors">
                 <Github className="h-4 w-4" />
               </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
