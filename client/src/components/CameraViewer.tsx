import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Hls from "hls.js";
import { AlertCircle, Camera, Download, Maximize } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CameraViewer() {
  const { data: streams = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/camera-streams"] });

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return streams.filter((stream: any) => {
      const status = stream.isActive ? "online" : "offline";
      const matchStatus = statusFilter === "all" || status === statusFilter;
      const hay = `${stream.petName || stream.petId} ${stream.roomNumber || ""}`.toLowerCase();
      const matchTerm = term === "" || hay.includes(term);
      return matchStatus && matchTerm;
    });
  }, [streams, statusFilter, search]);

  useEffect(() => {
    streams.forEach((stream: any) => {
      const url: string | undefined = stream?.streamUrl;
      const video = videoRefs.current[stream.id];
      if (!url || !video) return;

      const isHls = url.endsWith(".m3u8") || url.includes(".m3u8");
      if (isHls && Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(url);
        hls.attachMedia(video);
      } else {
        video.src = url;
      }
    });
  }, [streams]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-3xl font-bold" data-testid="text-page-title">
          Giám sát camera lưu trú
        </h1>
        <p className="mt-1 text-muted-foreground">Theo dõi trực tiếp tình trạng thú cưng trong khu vực theo dõi.</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Chỉ nhân sự được phân quyền mới có quyền truy cập camera. Dữ liệu video có thể được lưu 24-48 giờ tùy chính sách.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <p className="text-muted-foreground">Đang tải camera...</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm sm:w-72"
              placeholder="Tìm theo tên thú cưng hoặc phòng"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="online">Đang trực tuyến</option>
              <option value="offline">Ngoại tuyến</option>
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((stream: any) => (
              <Card key={stream.id} data-testid={`camera-card-${stream.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-medium">{stream.petName || stream.petId}</CardTitle>
                    <Badge variant={stream.isActive ? "default" : "secondary"}>{stream.isActive ? "Trực tuyến" : "Ngoại tuyến"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{stream.roomNumber || "Chưa gán phòng"}</p>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
                    {stream.isActive && stream.streamUrl ? (
                      <video ref={(el) => (videoRefs.current[stream.id] = el)} className="h-full w-full object-cover" controls playsInline />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Camera className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Camera đang ngoại tuyến</p>
                        </div>
                      </div>
                    )}

                    {stream.isActive && (
                      <div className="absolute left-2 top-2">
                        <div className="flex items-center gap-1 rounded bg-red-500 px-2 py-1 text-xs font-medium text-white">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                          TRỰC TIẾP
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1" disabled={!stream.isActive || !stream.streamUrl}>
                      <a href={stream.streamUrl} target="_blank" rel="noreferrer">
                        <Maximize className="mr-1 h-3 w-3" />
                        Mở toàn màn hình
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1" disabled={!stream.isActive || !stream.streamUrl}>
                      <a href={stream.streamUrl} download>
                        <Download className="mr-1 h-3 w-3" />
                        Tải luồng
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filtered.length === 0 && <div className="col-span-full py-12 text-center text-muted-foreground">Không có camera phù hợp bộ lọc.</div>}
          </div>
        </>
      )}
    </div>
  );
}
