import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type AspectRatio = '1:1' | '4:5' | '16:9';

export interface Asset {
  id: string;
  uri: string;
  finalUri?: string; // 🔐 ONE source of truth for previews
  width?: number;
  height?: number;
  createdAt?: number;
}

export interface CropParams {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

interface CreateFlowState {
  selectedImages: Asset[];
  globalRatio: AspectRatio;
  cropParams: { [id: string]: CropParams };

  // Actions
  setSelectedImages: (images: Asset[]) => void;
  toggleSelectImage: (asset: Asset) => void;
  setGlobalRatio: (ratio: AspectRatio) => void;
  updateCropParams: (assetId: string, params: CropParams) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  resetCreateFlow: () => void;
}

const defaultCropParams = (): CropParams => ({
  zoom: 0, // Sentinel for uninitialized
  offsetX: 0,
  offsetY: 0,
});

const CreateFlowContext = createContext<CreateFlowState | null>(null);

export function CreateFlowProvider({ children }: { children: ReactNode }) {
  const [selectedImages, setSelectedImagesState] = useState<Asset[]>([]);
  const [globalRatio, setGlobalRatioState] = useState<AspectRatio>('1:1');
  const [cropParams, setCropParamsState] = useState<{ [id: string]: CropParams }>({});

  const setSelectedImages = useCallback((images: Asset[]) => {
    setSelectedImagesState(images);
    // Initialize crop params for new images
    setCropParamsState((prev) => {
      const newCropParams = { ...prev };
      images.forEach((img) => {
        if (!newCropParams[img.id]) {
          newCropParams[img.id] = defaultCropParams();
        }
      });
      return newCropParams;
    });
  }, []);

  const toggleSelectImage = useCallback((asset: Asset) => {
    setSelectedImagesState((prev) => {
      const exists = prev.some((img) => img.id === asset.id);
      let newSelected: Asset[];

      if (exists) {
        // Deselect
        newSelected = prev.filter((img) => img.id !== asset.id);
      } else {
        // Select - append to preserve order
        newSelected = [...prev, asset];
      }

      // Clean up crop params for deselected images
      setCropParamsState((prevParams) => {
        const newCropParams = { ...prevParams };
        if (!exists) {
          // New selection - initialize params
          newCropParams[asset.id] = defaultCropParams();
        } else {
          // Deselection - remove params
          delete newCropParams[asset.id];
        }
        return newCropParams;
      });

      return newSelected;
    });
  }, []);

  const setGlobalRatio = useCallback((ratio: AspectRatio) => {
    setGlobalRatioState((prevRatio) => {
      // Scale offsets proportionally when ratio changes
      const ratioChangeFactor = getRatioChangeFactor(prevRatio, ratio);
      setCropParamsState((prev) => {
        const newCropParams: { [id: string]: CropParams } = {};

        Object.keys(prev).forEach((id) => {
          const params = prev[id];
          if (params) {
            newCropParams[id] = {
              zoom: params.zoom,
              offsetX: params.offsetX * ratioChangeFactor.x,
              offsetY: params.offsetY * ratioChangeFactor.y,
            };
          }
        });

        return newCropParams;
      });
      return ratio;
    });
  }, []);

  const updateCropParams = useCallback((assetId: string, params: CropParams) => {
    setCropParamsState((prev) => ({
      ...prev,
      [assetId]: params,
    }));
  }, []);

  const updateAsset = useCallback((id: string, updates: Partial<Asset>) => {
    setSelectedImagesState((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...updates } : img))
    );
  }, []);

  const resetCreateFlow = useCallback(() => {
    setSelectedImagesState([]);
    setGlobalRatioState('1:1');
    setCropParamsState({});
  }, []);

  const value: CreateFlowState = {
    selectedImages,
    globalRatio,
    cropParams,
    setSelectedImages,
    toggleSelectImage,
    setGlobalRatio,
    updateCropParams,
    updateAsset,
    resetCreateFlow,
  };

  return (
    <CreateFlowContext.Provider value={value}>
      {children}
    </CreateFlowContext.Provider>
  );
}

export function useCreateFlowStore(): CreateFlowState {
  const context = useContext(CreateFlowContext);
  if (!context) {
    throw new Error('useCreateFlowStore must be used within CreateFlowProvider');
  }
  return context;
}

// Helper to calculate ratio change factor for proportional offset scaling
function getRatioChangeFactor(
  oldRatio: AspectRatio,
  newRatio: AspectRatio
): { x: number; y: number } {
  const ratios: { [key in AspectRatio]: number } = {
    '1:1': 1,
    '4:5': 4 / 5,
    '16:9': 16 / 9,
  };

  const oldAspect = ratios[oldRatio];
  const newAspect = ratios[newRatio];

  // Scale factors to maintain relative position
  return {
    x: Math.sqrt(newAspect / oldAspect),
    y: Math.sqrt(oldAspect / newAspect),
  };
}

