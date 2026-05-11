/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  async rewrites() {
    return [
      // Staff / Team / Practitioners
      { source: '/team', destination: '/staff' },
      { source: '/trainers', destination: '/staff' },
      { source: '/practitioners', destination: '/staff' },
      
      // Services / Classes / Treatments
      { source: '/classes', destination: '/services' },
      { source: '/treatments', destination: '/services' },
      
      // Clients / Members / Patients
      { source: '/clients', destination: '/customers' },
      { source: '/members', destination: '/customers' },
      { source: '/patients', destination: '/customers' },

      // Bookings / Sessions / Appointments
      { source: '/bookings', destination: '/appointments' },
    ];
  },
};

export default nextConfig;
