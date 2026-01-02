import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Loader2, Camera, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/useAuth";

interface QrScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QrScanner({ open, onOpenChange }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const processedQrRef = useRef<string | null>(null); // Track which QR was processed to prevent duplicates
  const { toast } = useToast();
  const { firebaseUser } = useAuth();

  useEffect(() => {
    if (open && !success) {
      // Reset processed QR tracking when opening fresh
      processedQrRef.current = null;
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [open, success]);

  const startScanner = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Initialize ZXing reader
        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;

        // Start decoding from video
        codeReader.decodeFromVideoElement(videoRef.current, async (result, error) => {
          if (result) {
            // QR code detected
            const scannedData = result.getText();
            await handleQrCodeScanned(scannedData);
          }
          
          if (error) {
            // Ignore "not found" errors during scanning - they're normal
            // console.error("QR Scanner error:", error);
          }
        });
      }
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      if (err.name === 'NotAllowedError') {
        setError("Permissão de câmera negada. Por favor, permita o acesso à câmera.");
      } else if (err.name === 'NotFoundError') {
        setError("Nenhuma câmera encontrada. Verifique se seu dispositivo possui uma câmera.");
      } else {
        setError("Erro ao iniciar scanner. Tente novamente.");
      }
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    // Stop the code reader
    if (codeReaderRef.current) {
      // BrowserMultiFormatReader doesn't have a reset method
      // We'll just null it and stop the video tracks
      codeReaderRef.current = null;
    }

    // Stop all video tracks
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  };

  const handleQrCodeScanned = async (qrData: string) => {
    // Check if we've already processed this exact QR code
    if (processing || success || processedQrRef.current === qrData) return;

    // Mark this QR as being processed to prevent duplicates
    processedQrRef.current = qrData;
    setProcessing(true);
    stopScanner();

    try {
      // QR data is just the sessionId (plain text, not JSON)
      const sessionId = qrData.trim();

      if (!sessionId || sessionId.length < 32) {
        throw new Error("QR Code inválido");
      }

      // Get user's ID token using firebaseUser from useAuth
      if (!firebaseUser) {
        throw new Error("Você precisa estar autenticado no app para escanear QR Codes. Por favor, faça login primeiro.");
      }

      const idToken = await firebaseUser.getIdToken();

      // Call backend to authorize the session
      const response = await fetch('/api/auth/qr/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      // Handle rate limiting specially
      if (response.status === 429) {
        throw new Error("Aguarde 1 minuto e tente novamente");
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || "Erro ao autorizar sessão");
      }

      // Success!
      setSuccess(true);
      toast({
        title: "Login autorizado!",
        description: `Desktop conectado com sucesso. Bem-vindo, ${data.userDisplayName || 'Usuário'}!`,
      });

      // Close dialog after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setProcessing(false);
        processedQrRef.current = null;
      }, 2000);

    } catch (err: any) {
      console.error("Error authorizing QR session:", err);
      setError(err.message || "Erro ao processar QR Code");
      setProcessing(false);
      
      toast({
        title: "Erro ao escanear",
        description: err.message || "Não foi possível autorizar o login",
        variant: "destructive",
      });

      // Allow retry after clearing the processed ref
      setTimeout(() => {
        setError(null);
        processedQrRef.current = null; // Allow new scans
        if (open) {
          startScanner();
        }
      }, 3000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-qr-scanner">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Escanear QR Code
          </DialogTitle>
          <DialogDescription>
            Aponte a câmera para o QR Code exibido no desktop para fazer login
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video preview */}
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
            {success ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500 text-white">
                <CheckCircle2 className="w-16 h-16 mb-2" />
                <p className="text-lg font-semibold">Login Autorizado!</p>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mb-2" />
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startScanner}
                  className="mt-4"
                  data-testid="button-retry-scanner"
                >
                  Tentar Novamente
                </Button>
              </div>
            ) : processing ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Processando...</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  data-testid="video-qr-scanner"
                />
                {isScanning && (
                  <div className="absolute inset-0 border-4 border-primary/50 rounded-lg pointer-events-none">
                    <div className="absolute inset-4 border-2 border-primary rounded-lg" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Instructions */}
          {!error && !success && !processing && (
            <div className="text-sm text-muted-foreground text-center space-y-2">
              <p>📱 Posicione o QR Code dentro do quadro</p>
              <p>💡 Certifique-se de que há boa iluminação</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
