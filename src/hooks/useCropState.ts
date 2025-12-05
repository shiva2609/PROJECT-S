import { useState, useCallback } from 'react';

export type AspectRatio = '1:1' | '4:5' | '16:9';

export interface CropParams {
  zoom: number;
  offsetX: number;
  offsetY: number;
  ratio: AspectRatio;
}

interface CropState {
  [imageId: string]: CropParams;
}

export function useCropState() {
  const [cropState, setCropState] = useState<CropState>({});

  const saveCropParams = useCallback((imageId: string, params: CropParams) => {
    setCropState((prev) => ({
      ...prev,
      [imageId]: params,
    }));
  }, []);

  const getCropParams = useCallback((imageId: string): CropParams | undefined => {
    return cropState[imageId];
  }, [cropState]);

  const getAllCropParams = useCallback((): CropState => {
    return cropState;
  }, [cropState]);

  const clearCropParams = useCallback(() => {
    setCropState({});
  }, []);

  return {
    saveCropParams,
    getCropParams,
    getAllCropParams,
    clearCropParams,
  };
}

