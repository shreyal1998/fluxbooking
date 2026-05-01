export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-slate-950">
      <div className="premium-pulsar-container">
        <div className="liquid-loader">
          <div className="liquid-blob"></div>
          <div className="liquid-blob"></div>
          <div className="liquid-blob"></div>
        </div>
      </div>
    </div>
  );
}
