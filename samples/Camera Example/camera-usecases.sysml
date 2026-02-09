package CameraUseCases {

    // Actors (declared as part defs; 'actor' is a usage modifier in SysML v2)
    part def Photographer;
    part def CameraSystem;
    part def StorageDevice;

    // Use Cases
    use case def TakePhoto {
        subject camera : CameraSystem;
    }

    use case def AdjustSettings {
        subject camera : CameraSystem;
    }

    use case def ReviewPhotos {
        subject camera : CameraSystem;
    }

    use case def DeletePhoto {
        subject camera : CameraSystem;
    }

    use case def TransferPhotos {
        subject camera : CameraSystem;
    }

    use case def ChargeBattery {
        subject camera : CameraSystem;
    }

    use case def Autofocus {
        subject camera : CameraSystem;
    }

    use case def AutoExposure {
        subject camera : CameraSystem;
    }

    use case def SaveToMemory {
        subject camera : CameraSystem;
    }
}
