export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center min-h-[400px]">
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
