package CameraTestActivity {
    public import CameraTestBDD::*;
    public import ScalarValues::*;
    public import RealFunctions::*;

    action def PrepareCamera {
        out powered : Boolean;
        out opticsReady : Boolean;

        action wakePower {
            out batteryLevel : Real;
        }

        then if (batteryLevel >= 20.0) {
            action enableRegulators {
                out regulatorsReady : Boolean;
            }
        } else {
            action reportLowBattery {
                out powered : Boolean;
                out opticsReady : Boolean;
            }
        }

        then action initializeOptics {
            in regulatorsReady : Boolean;
            out focusCalibrated : Boolean;
        }

        then action confirmReady {
            in focusCalibrated : Boolean;
            out powered : Boolean;
            out opticsReady : Boolean;
        }
    }

    action def AcquireFrame {
        in opticsReady : Boolean;
        in exposureTarget : Real;
        out frameData : String;

        action meterScene {
            in lightTarget : Real;
            out measuredLux : Real;
        }

        then action adjustSensor {
            in measuredLux : Real;
            in desiredExposure : Real;
            out integrationTime : Real;
        }

        then action triggerShutter {
            in integrationTime : Real;
            out photonCharge : Real;
        }

        then action readSensor {
            in photonCharge : Real;
            out frameData : String;
        }
    }

    action def PostProcessBurst {
        in frameData : String;
        in burstCount : Integer;
        out curatedSet : Integer;

        action evaluateSharpness {
            in rawFrame : String;
            out score : Real;
        }

        then if (score >= 0.8) {
            action enqueueFrame {
                in framePayload : String;
                in nextIndex : Integer;
                out updatedCount : Integer;
            }
        } else {
            action discardFrame {
                in reason : String;
            }
        }

        then action finalizeSet {
            in updatedCount : Integer;
            out curatedSet : Integer;
        }
    }

    action captureWorkflow {
        first start;

        then action declareContext {
            out desiredExposure : Real;
            out burstTarget : Integer;
        }

        then action prepare : PrepareCamera {
            out powered : Boolean;
            out opticsReady : Boolean;
        }

        then if (powered) {
            action acquire : AcquireFrame {
                in opticsReady : Boolean;
                in exposureTarget : Real;
                out frameData : String;
            }

            then action bufferFrame {
                in payload : String;
                out storedFrame : String;
            }
        } else {
            action abortSequence {
                out logMessage : String;
            }
        }

        then action post : PostProcessBurst {
            in frameData : String;
            in burstCount : Integer;
            out curatedSet : Integer;
        }

        then action updateStorage {
            in acceptedFrames : Integer;
            out storageUsage : Real;
        }

        then done;
    }
}
