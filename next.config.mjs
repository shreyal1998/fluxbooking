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
      { source: '/appointments/:id', destination: '/booking/:id' },
      { source: '/bookings/:id', destination: '/booking/:id' },
      { source: '/sessions/:id', destination: '/booking/:id' },
      { source: '/appointments', destination: '/booking' },
      { source: '/bookings', destination: '/booking' },
      { source: '/sessions', destination: '/booking' },
    ];
  },
};

export default nextConfig;
