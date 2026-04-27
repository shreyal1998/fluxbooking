"use client";

import { useState } from "react";
import { Users, X, Lock, Settings2, Clock, Scissors, Check } from "lucide-react";
import { AvailabilityEditor } from "./availability-editor";
import { EditStaffForm } from "./edit-staff-form";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";

interface StaffMember {
  id: string;
  name: string;
  bio: string | null;
  color: string;
  availabilityJson: any;
  user?: {
    email: string;
    phone: string | null;
  } | null;
  services?: any[];
}

interface StaffListProps {
  staffMembers: StaffMember[];
  currentLimit: number;
  services: any[];
}

export function StaffList({ staffMembers, currentLimit, services }: StaffListProps) {
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "availability">("profile");

  useLockBodyScroll(!!editingStaff);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {staffMembers.map((member, index) => {
          const isLocked = index >= currentLimit;

          return (
            <div key={member.id} className={`p-6 rounded-xl border transition-all ${
              isLocked 
              ? "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-60 grayscale" 
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
            }`}>
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className={`h-12 w-12 rounded-full flex items-center justify-center border-2`}
                  style={{ borderColor: isLocked ? 'transparent' : member.color, backgroundColor: isLocked ? undefined : `${member.color}10` }}
                >
                  {isLocked ? (
                    <div className="h-full w-full rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                  ) : (
                    <Users className="h-6 w-6" style={{ color: member.color }} />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    {member.name}
                    {isLocked && <span className="text-[8px] font-black uppercase bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">Locked</span>}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{isLocked ? "Limit Reached" : member.user?.email || "Staff Member"}</p>
                </div>
              </div>

              {/* Display Assigned Services */}
              {!isLocked && member.services && member.services.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {member.services?.map((service: any) => (
                    <span 
                      key={service.id} 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: service.color }}></div>
                      {service.name}
                    </span>
                  ))}
                </div>
              )}

              {member.bio && (
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                  {member.bio}
                </p>
              )}
              <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                {!isLocked ? (
                  <button 
                    onClick={() => {
                      setEditingStaff(member);
                      setActiveTab("profile");
                    }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-2"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Manage Staff
                  </button>
                ) : (
                  <span className="text-xs font-medium text-slate-400">Inactive on current plan</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Management Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-height-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div 
                  className="h-10 w-10 rounded-full flex items-center justify-center border-2"
                  style={{ borderColor: editingStaff.color, backgroundColor: `${editingStaff.color}10` }}
                >
                  <Users className="h-5 w-5" style={{ color: editingStaff.color }} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Manage Staff</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Configuring {editingStaff.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingStaff(null)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-700 px-6">
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-4 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === "profile" 
                  ? "border-indigo-600 text-indigo-600" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab("availability")}
                className={`px-4 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === "availability" 
                  ? "border-indigo-600 text-indigo-600" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Availability
              </button>
            </div>

            <div className="p-8 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/20">
              {activeTab === "profile" ? (
                <EditStaffForm 
                  staff={editingStaff} 
                  isAdmin={true} 
                  onSuccess={() => setEditingStaff(null)} 
                  services={services}
                />
              ) : (
                <AvailabilityEditor 
                  staffId={editingStaff.id} 
                  initialAvailability={editingStaff.availabilityJson} 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
