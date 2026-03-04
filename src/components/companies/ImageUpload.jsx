import React, { useState, useRef, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

function ImageUpload({ label, value, onChange }) {
  const [preview, setPreview] = useState(value);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    setPreview(value);
  }, [value]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'image/png') {
        toast({
          variant: 'destructive',
          title: 'Formato inválido!',
          description: 'Por favor, selecione um arquivo de imagem PNG.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setPreview(base64String);
        onChange(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = () => {
    setPreview('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label className="text-slate-300">{label}</Label>
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/png"
        onChange={handleFileChange}
        className="hidden"
      />
      {!preview && (
        <button
          type="button"
          onClick={triggerFileSelect}
          className="w-full h-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-lg hover:bg-slate-800/50 transition-colors"
        >
          <Upload className="w-8 h-8 text-slate-500 mb-2" />
          <span className="text-sm text-slate-400">Selecionar PNG</span>
        </button>
      )}
      {preview && (
        <div className="mt-2 p-2 border border-dashed border-slate-700 rounded-lg relative bg-slate-800/50">
          <div className="w-full h-24 flex items-center justify-center">
            <img src={preview} alt={`${label} preview`} className="max-h-full max-w-full object-contain" />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;