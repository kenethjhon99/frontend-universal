import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

const BARCODE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "itf",
  "qr_code",
];

function BarcodeCameraDialog({
  open,
  onClose,
  onDetected,
  title = "Escanear con camara",
  description = "Apunta la camara al codigo de barras. El sistema lo usara en cuanto lo detecte.",
}) {
  const [scannerSupported, setScannerSupported] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const frameRef = useRef(null);
  const scanLockRef = useRef(false);

  const stopScanner = useCallback(() => {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause?.();
      videoRef.current.srcObject = null;
    }

    scanLockRef.current = false;
  }, []);

  useEffect(() => {
    const supportsScanner =
      typeof window !== "undefined" &&
      "BarcodeDetector" in window &&
      Boolean(navigator?.mediaDevices?.getUserMedia);

    setScannerSupported(supportsScanner);
  }, []);

  useEffect(() => {
    if (!open) {
      stopScanner();
      setScannerError("");
      return undefined;
    }

    if (!scannerSupported) {
      setScannerError(
        "Tu navegador no soporta escaneo por camara en este dispositivo. Puedes seguir usando el lector manual."
      );
      return undefined;
    }

    let isMounted = true;

    const startScanner = async () => {
      try {
        setScannerLoading(true);
        setScannerError("");

        if (!detectorRef.current) {
          const BarcodeDetectorClass = window.BarcodeDetector;
          const supportedFormats =
            typeof BarcodeDetectorClass.getSupportedFormats === "function"
              ? await BarcodeDetectorClass.getSupportedFormats()
              : [];

          const formats = Array.isArray(supportedFormats)
            ? BARCODE_FORMATS.filter((format) => supportedFormats.includes(format))
            : [];

          detectorRef.current =
            formats.length > 0
              ? new BarcodeDetectorClass({ formats })
              : new BarcodeDetectorClass();
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const scanFrame = async () => {
          if (
            !isMounted ||
            !videoRef.current ||
            !detectorRef.current ||
            scanLockRef.current
          ) {
            return;
          }

          try {
            if (videoRef.current.readyState >= 2) {
              const barcodes = await detectorRef.current.detect(videoRef.current);
              const rawValue = String(barcodes?.[0]?.rawValue || "").trim();

              if (rawValue) {
                scanLockRef.current = true;
                const shouldClose = (await onDetected?.(rawValue)) !== false;

                if (shouldClose) {
                  onClose?.();
                } else {
                  scanLockRef.current = false;
                }
                return;
              }
            }
          } catch (error) {
            console.error(error);
            setScannerError("No se pudo leer el codigo con la camara.");
            onClose?.();
            return;
          }

          frameRef.current = window.requestAnimationFrame(scanFrame);
        };

        frameRef.current = window.requestAnimationFrame(scanFrame);
      } catch (error) {
        console.error(error);
        setScannerError(
          error?.name === "NotAllowedError"
            ? "Debes permitir el acceso a la camara para escanear codigos."
            : "No se pudo iniciar la camara del dispositivo."
        );
      } finally {
        if (isMounted) {
          setScannerLoading(false);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [open, onClose, onDetected, scannerSupported, stopScanner]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 7 }}>
        {title}
        <IconButton onClick={onClose} sx={{ position: "absolute", right: 12, top: 12 }}>
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>

          {scannerError ? <Alert severity="warning">{scannerError}</Alert> : null}

          <Box
            sx={{
              position: "relative",
              borderRadius: 3,
              overflow: "hidden",
              bgcolor: "common.black",
              minHeight: 280,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            {scannerLoading ? (
              <Stack
                spacing={1.5}
                alignItems="center"
                justifyContent="center"
                sx={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 2,
                  backgroundColor: "rgba(15,23,42,0.55)",
                }}
              >
                <CircularProgress color="inherit" />
                <Typography variant="body2" color="common.white">
                  Iniciando camara...
                </Typography>
              </Stack>
            ) : null}

            <Box
              component="video"
              ref={videoRef}
              muted
              playsInline
              autoPlay
              sx={{
                width: "100%",
                minHeight: 280,
                display: "block",
                objectFit: "cover",
                backgroundColor: "common.black",
              }}
            />

            <Box
              sx={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 340,
                  height: 150,
                  borderRadius: 3,
                  border: "2px solid rgba(255,255,255,0.92)",
                  boxShadow: "0 0 0 999px rgba(0,0,0,0.20)",
                  position: "relative",
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    left: 18,
                    right: 18,
                    top: "50%",
                    height: 2,
                    transform: "translateY(-50%)",
                    background:
                      "linear-gradient(90deg, rgba(59,130,246,0) 0%, rgba(59,130,246,1) 50%, rgba(59,130,246,0) 100%)",
                  },
                }}
              />
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default BarcodeCameraDialog;
