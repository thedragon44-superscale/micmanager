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

      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/avatar`, {
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
          src={currentAvatar || `https://ui-avatars.com/api/?name=User&background=18191a&color=e4e6eb`} 
          alt="Avatar" 
          className="w-24 h-24 rounded-full object-cover border-2 border-[#2d88ff] shadow-sm"
        />
        <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
          <i className="fa-solid fa-camera text-white text-xl"></i>
          <input type="file" accept="image/*" onChange={onSelectFile} className="hidden" />
        </label>
      </div>

      {imgSrc && (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#242526] border border-[#3e4042] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 items-center">
            
            <div className="text-center w-full mb-1">
              <h3 className="text-white font-bold uppercase tracking-wide font-display text-lg">Crop Avatar</h3>
              <p className="text-[#b0b3b8] font-mono-data text-[10px] mt-0.5">Pinch and drag to adjust your headshot.</p>
            </div>
            
            <div className="w-full bg-[#18191a] rounded-xl overflow-hidden border border-[#3e4042] flex items-center justify-center p-2 max-h-[280px]">
              <ReactCrop crop={crop} onChange={(pixelCrop) => setCrop(pixelCrop)} aspect={1} circularCrop>
                <img ref={imgRef} src={imgSrc} alt="Crop preview" onLoad={onImageLoad} className="max-h-[220px] w-auto object-contain" />
              </ReactCrop>
            </div>
            
            <div className="flex gap-2 w-full mt-2">
              <button 
                onClick={() => setImgSrc('')} 
                className="flex-1 py-3 text-[10px] font-bold text-white bg-[#18191a] border border-[#3e4042] rounded-lg hover:bg-gray-800 uppercase tracking-widest font-mono-data transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpload} 
                disabled={isUploading} 
                className="flex-1 py-3 text-[10px] font-bold text-white bg-[#2d88ff] hover:bg-[#1b74e4] rounded-lg uppercase tracking-widest font-mono-data transition-colors disabled:opacity-50"
              >
                {isUploading ? 'Saving...' : 'Save Crop'}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
