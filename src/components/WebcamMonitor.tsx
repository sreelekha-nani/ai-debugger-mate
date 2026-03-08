import { useEffect, useRef } from "react";
import { Camera, CameraOff } from "lucide-react";

interface WebcamMonitorProps {
  stream: MediaStream | null;
  active: boolean;
}

const WebcamMonitor = ({ stream, active }: WebcamMonitorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-32 h-24 rounded-lg overflow-hidden border-2 border-border bg-secondary/50">
      {active && stream ? (
        <>
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <div className="absolute top-1 right-1">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          </div>
          <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-background/80 rounded px-1 py-0.5">
            <Camera className="w-2.5 h-2.5 text-success" />
            <span className="text-[9px] text-success font-mono">LIVE</span>
          </div>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
          <CameraOff className="w-5 h-5 mb-1" />
          <span className="text-[9px]">Camera Off</span>
        </div>
      )}
    </div>
  );
};

export default WebcamMonitor;
