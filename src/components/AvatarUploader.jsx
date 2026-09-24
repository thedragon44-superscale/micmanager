import { useState, useRef } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';

export default function AvatarUploader({ userId, currentAvatar, onUploadSuccess }) {
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const imgRef = useRef(null);

  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
      width, height
    );
    setCrop(crop);
  };

  const getCroppedImg = async () => {
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // Lock output to 250x250
    canvas.width = 250;
    canvas.height = 250;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      crop.x * scaleX, crop.y * scaleY,
      crop.width * scaleX, crop.height * scaleY,
      0, 0,
      250, 250
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/webp', 1);
    });
  };

  const handleUpload = async () => {
    if (!crop || !imgRef.current) return;
    setIsUploading(true);

    try {
      const croppedBlob = await getCroppedImg();
      const croppedFile = new File([croppedBlob], 'avatar.webp', { type: 'image/webp' });

      // Compress to ensure it stays tiny
      const compressedFile = await imageCompression(croppedFile, {
        maxSizeMB: 0.05, // 50KB limit
        maxWidthOrHeight: 250,
        useWebWorker: true,
        fileType: 'image/webp'
      });

      const formData = new FormData();
      formData.append('file', compressedFile);

      const res = await fetch(`http://127.0.0.1:8000/users/${userId}/avatar`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Avatar updated!');
        setImgSrc('');
        if (onUploadSuccess) onUploadSuccess(data.avatar_url);
      } else {
        toast.error('Failed to upload avatar.');
      }
    } catch (err) {
      toast.error('Compression or upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="relative group cursor-pointer flex-shrink-0 z-10">
        <img 
          src={currentAvatar || `https://ui-avatars.com/api/?name=User&background=312e81&color=fff`} 
          alt="Avatar" 
          className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
        />
        <label className="absolute inset-0 flex items-center justify-center bg-slate-950/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
          <i className="fa-solid fa-camera text-white text-xl"></i>
          <input type="file" accept="image/*" onChange={onSelectFile} className="hidden" />
        </label>
      </div>

      {imgSrc && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="w-full max-w-sm flex flex-col gap-6 items-center">
            <div className="text-center w-full mb-2">
              <h3 className="text-white font-black uppercase tracking-widest text-lg">Crop Avatar</h3>
              <p className="text-slate-400 text-xs mt-1">Pinch and drag to adjust your headshot.</p>
            </div>
            
            <div className="w-full bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center p-2 mb-5 max-h-[280px]">
              <ReactCrop crop={crop} onChange={(pixelCrop) => setCrop(pixelCrop)} aspect={1} circularCrop>
                <img ref={imgRef} src={imgSrc} alt="Crop preview" onLoad={onImageLoad} className="max-h-[220px] w-auto object-contain" />
              </ReactCrop>
            </div>
            
            <div className="flex gap-3 w-full mt-4">
              <button onClick={() => setImgSrc('')} className="flex-1 py-4 text-xs font-bold text-slate-300 bg-slate-800 rounded-xl hover:bg-slate-700 uppercase tracking-widest transition-colors shadow-sm">
                Cancel
              </button>
              <button onClick={handleUpload} disabled={isUploading} className="flex-1 py-4 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/50 active:scale-95 disabled:opacity-50">
                {isUploading ? 'Saving...' : 'Save Crop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
