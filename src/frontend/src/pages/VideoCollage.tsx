import { useState, useRef } from 'react';
import { Upload, Trash2, Download, Play, Pause, Loader, AlertCircle } from 'lucide-react';

interface VideoItem {
  id: string;
  file: File;
  preview: string;
  isPlaying: boolean;
}

export function VideoCollage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [collageMode, setCollageMode] = useState<'merge' | 'grid'>('merge');
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

  const mergeVideos = async () => {
    if (videos.length === 0) {
      setError('Please add at least one video');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessingProgress(0);

    try {
      const formData = new FormData();

      // Append all video files to FormData
      for (const video of videos) {
        formData.append('videos', video.file);
      }

      formData.append('outputFilename', `moms-60th-birthday-${collageMode}-${Date.now()}.mp4`);

      setProcessingProgress(20);

      const endpoint = collageMode === 'merge'
        ? '/api/video-collage/merge'
        : '/api/video-collage/grid';

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create video collage');
      }

      setProcessingProgress(90);

      // Get the blob and download it
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `moms-60th-birthday-${collageMode}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProcessingProgress(100);
      setTimeout(() => setProcessingProgress(0), 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create video collage';
      setError(errorMessage);
      console.error('Video merge error:', err);
    } finally {
      setIsProcessing(false);
    }
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

            {/* Mode Selection */}
            <div className="flex justify-center gap-4 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="collage-mode"
                  value="merge"
                  checked={collageMode === 'merge'}
                  onChange={(e) => setCollageMode(e.target.value as 'merge' | 'grid')}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">Sequential Merge</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="collage-mode"
                  value="grid"
                  checked={collageMode === 'grid'}
                  onChange={(e) => setCollageMode(e.target.value as 'merge' | 'grid')}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">Grid Layout</span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">Error</h3>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Processing Progress */}
            {isProcessing && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="text-blue-900 font-semibold">
                    Creating your video collage...
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <p className="text-blue-600 text-sm mt-2">{processingProgress}% complete</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={mergeVideos}
                disabled={isProcessing || videos.length === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all shadow-lg ${
                  isProcessing || videos.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 hover:shadow-xl'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Create & Download Video
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setVideos([]);
                  setError(null);
                }}
                disabled={isProcessing}
                className={`px-6 py-3 rounded-lg transition-colors ${
                  isProcessing
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
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
