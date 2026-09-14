import { useState, useRef } from 'react';
import { Upload, Trash2, Download, Play, Pause } from 'lucide-react';

interface VideoItem {
  id: string;
  file: File;
  preview: string;
  isPlaying: boolean;
}

export function VideoCollage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type.startsWith('video/')
    );

    files.forEach((file) => {
      addVideo(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      addVideo(file);
    });
  };

  const addVideo = (file: File) => {
    const id = `${Date.now()}-${Math.random()}`;
    const preview = URL.createObjectURL(file);

    setVideos((prev) => [
      ...prev,
      { id, file, preview, isPlaying: false },
    ]);
  };

  const removeVideo = (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const togglePlayPause = (id: string) => {
    const video = videoRefs.current[id];
    if (video) {
      if (video.paused) {
        video.play();
        setVideos((prev) =>
          prev.map((v) => (v.id === id ? { ...v, isPlaying: true } : v))
        );
      } else {
        video.pause();
        setVideos((prev) =>
          prev.map((v) => (v.id === id ? { ...v, isPlaying: false } : v))
        );
      }
    }
  };

  const downloadCollage = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cols = Math.ceil(Math.sqrt(videos.length));
    const rows = Math.ceil(videos.length / cols);
    const tileSize = 300;
    const padding = 10;

    canvas.width = cols * (tileSize + padding) + padding;
    canvas.height = rows * (tileSize + padding) + padding;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < videos.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = col * (tileSize + padding) + padding;
      const y = row * (tileSize + padding) + padding;

      const video = videoRefs.current[videos[i].id];
      if (video && video.readyState >= 2) {
        ctx.drawImage(video, x, y, tileSize, tileSize);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tileSize, tileSize);
      }
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `moms-60th-birthday-collage-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  const gridCols = Math.ceil(Math.sqrt(videos.length)) || 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-900 mb-2">
            🎉 Happy 60th Birthday Mom! 🎉
          </h1>
          <p className="text-lg text-purple-700">
            Create a beautiful video collage with your favorite moments
          </p>
        </div>

        {/* Upload Section */}
        <div className="mb-8">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-purple-500 bg-purple-50'
                : 'border-purple-300 bg-white'
            }`}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-purple-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Drop your videos here
            </h2>
            <p className="text-gray-600 mb-4">
              or click to select videos from your computer
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-block px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Choose Videos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          <p className="text-center text-gray-600 mt-2 text-sm">
            {videos.length} video{videos.length !== 1 ? 's' : ''} added
            {videos.length > 0 && ` - ${Math.ceil(Math.sqrt(videos.length))}×${Math.ceil(Math.sqrt(videos.length))} grid`}
          </p>
        </div>

        {/* Video Grid */}
        {videos.length > 0 && (
          <div className="mb-8">
            <div
              className="grid gap-4 mb-6"
              style={{
                gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
              }}
            >
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="relative bg-black rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow group"
                >
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current[video.id] = el;
                    }}
                    src={video.preview}
                    className="w-full h-64 object-cover"
                    onEnded={() => {
                      setVideos((prev) =>
                        prev.map((v) =>
                          v.id === video.id ? { ...v, isPlaying: false } : v
                        )
                      );
                    }}
                  />

                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-3">
                    <button
                      onClick={() => togglePlayPause(video.id)}
                      className="p-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                      title={video.isPlaying ? 'Pause' : 'Play'}
                    >
                      {video.isPlaying ? (
                        <Pause className="w-6 h-6 text-purple-600 fill-purple-600" />
                      ) : (
                        <Play className="w-6 h-6 text-purple-600 ml-0.5" />
                      )}
                    </button>
                    <button
                      onClick={() => removeVideo(video.id)}
                      className="p-3 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Remove video"
                    >
                      <Trash2 className="w-6 h-6 text-white" />
                    </button>
                  </div>

                  {/* Video Name */}
                  <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black to-transparent">
                    <p className="text-white text-sm truncate">
                      {video.file.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={downloadCollage}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
              >
                <Download className="w-5 h-5" />
                Download Collage Screenshot
              </button>
              <button
                onClick={() => setVideos([])}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {videos.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg">
            <div className="text-6xl mb-4">🎥</div>
            <p className="text-gray-600 text-lg">
              Start by uploading videos to create your birthday collage!
            </p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-3xl mb-2">📱</div>
            <h3 className="font-semibold text-gray-900 mb-2">Upload Videos</h3>
            <p className="text-gray-600 text-sm">
              Drag and drop or click to upload multiple videos in any format
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-3xl mb-2">🎨</div>
            <h3 className="font-semibold text-gray-900 mb-2">Organize Layout</h3>
            <p className="text-gray-600 text-sm">
              Videos automatically arrange in an optimal grid layout
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-3xl mb-2">⬇️</div>
            <h3 className="font-semibold text-gray-900 mb-2">Download & Share</h3>
            <p className="text-gray-600 text-sm">
              Create a beautiful screenshot of your video collage to share
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
