import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { addService } from "@/app/actions/dashboard";
import { Scissors, Plus, Clock, DollarSign, Palette } from "lucide-react";

export default async function ServicesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const services = await prisma.service.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Services</h2>
          <p className="text-slate-500 font-medium">Manage the services your business offers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Service Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-soft sticky top-8">
            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Plus className="h-5 w-5" />
              </div>
              Add New Service
            </h3>
            <form 
              action={async (formData) => {
                "use server";
                await addService(formData);
              }} 
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Service Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g., Haircut & Style"
                  className="w-full rounded-xl border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Duration (min)</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      name="duration"
                      type="number"
                      required
                      placeholder="30"
                      className="w-full pl-10 rounded-xl border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Price ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      required
                      placeholder="50.00"
                      className="w-full pl-10 rounded-xl border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Palette className="h-4 w-4 text-slate-400" />
                  Calendar Color
                </label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { name: 'Indigo', value: '#6366f1' },
                    { name: 'Emerald', value: '#10b981' },
                    { name: 'Sky', value: '#0ea5e9' },
                    { name: 'Amber', value: '#f59e0b' },
                    { name: 'Rose', value: '#f43f5e' },
                    { name: 'Violet', value: '#8b5cf6' },
                  ].map((color) => (
                    <label key={color.value} className="relative cursor-pointer group">
                      <input type="radio" name="color" value={color.value} className="peer sr-only" defaultChecked={color.name === 'Indigo'} />
                      <div className="w-8 h-8 rounded-xl border-2 border-transparent peer-checked:border-indigo-600 peer-checked:scale-110 transition-all shadow-sm group-hover:scale-110" style={{ backgroundColor: color.value }}></div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                Create Service
              </button>
            </form>
          </div>
        </div>

        {/* Services List */}
        <div className="lg:col-span-2 space-y-4">
          {services.length === 0 ? (
            <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
              <Scissors className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-bold">No services added yet</p>
              <p className="text-sm text-slate-400">Create your first service to start taking bookings.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((service) => (
                <div key={service.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft relative overflow-hidden group hover:shadow-xl transition-all">
                  <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: service.color }}></div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="font-bold text-slate-900">{service.name}</h4>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" /> {service.durationMinutes} minutes
                      </p>
                    </div>
                    <span className="font-black text-indigo-600">${service.price.toString()}</span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-lg shadow-sm" style={{ backgroundColor: service.color }}></div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calendar Theme</span>
                    </div>
                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
