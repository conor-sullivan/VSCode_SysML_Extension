package RemoteControlCar {
    /**
    * Remote Control Car model demonstrating SysML v2.0 syntax
    * including parts, ports, connections, constraints, requirements,
    * use cases, actions, and state machines.
    *
    * Models a 1/10 scale AWD RC car with dual brushless motors,
    * LiPo battery, 2.4 GHz radio, and electronic speed controllers.
    */

    // ─── Port Definitions ──────────────────────────────────────────

    port def RadioPort {
        attribute frequency : Real;
        attribute channel : Integer;
    }

    port def PowerPort {
        attribute voltage : Real;
        attribute current : Real;
    }

    port def SignalPort {
        attribute pwmWidth : Real;
    }

    // ─── Part Definitions ──────────────────────────────────────────

    part def Chassis {
        attribute length : Real;
        attribute width : Real;
        attribute material : String;
        attribute mass : Real;
    }

    part def Motor {
        attribute kv : Real;
        attribute maxRPM : Real;
        attribute mass : Real;
        port powerIn : PowerPort;
        port signalIn : SignalPort;
    }

    part def Battery {
        attribute cellCount : Integer;
        attribute capacityMah : Real;
        attribute voltage : Real;
        attribute mass : Real;
        port powerOut : PowerPort;

        constraint voltageRange {
            voltage >= 3.7 and voltage <= 22.2
        }
    }

    part def ESC {
        attribute maxCurrent : Real;
        attribute mass : Real;
        port powerIn : PowerPort;
        port motorOut : PowerPort;
        port signalIn : SignalPort;
    }

    part def Receiver {
        attribute channels : Integer;
        attribute mass : Real;
        port radioIn : RadioPort;
        port throttleOut : SignalPort;
        port steeringOut : SignalPort;
    }

    part def SteeringServo {
        attribute torque : Real;
        attribute speed : Real;
        attribute mass : Real;
        port signalIn : SignalPort;
    }

    part def Wheel {
        attribute diameter : Real;
        attribute width : Real;
        attribute compound : String;
    }

    part def Transmitter {
        attribute channels : Integer;
        attribute range : Real;
        port radioOut : RadioPort;
    }

    part def Driver;

    // ─── System Definition ─────────────────────────────────────────

    part def RCCar {
        part chassis : Chassis;
        part frontMotor : Motor;
        part rearMotor : Motor;
        part battery : Battery;
        part receiver : Receiver;
        part esc : ESC[2];
        part servo : SteeringServo;
        part wheels : Wheel[4];

        port radioIn : RadioPort;

        attribute mass : Real;
        attribute topSpeed : Real;
        attribute controlRange : Real;

        constraint massLimit {
            mass <= 5.0
        }

        constraint speedLimit {
            topSpeed <= 100.0
        }
    }

    // ─── Connections ───────────────────────────────────────────────

    connection def PowerConnection {
        end source : PowerPort;
        end target : PowerPort;
    }

    connection def SignalConnection {
        end source : SignalPort;
        end target : SignalPort;
    }

    connection def RadioLink {
        end source : RadioPort;
        end target : RadioPort;
    }

    // ─── Requirements ──────────────────────────────────────────────

    requirement def RuntimeReq {
        doc /* The RC car shall operate for at least 20 minutes on a full charge */
        subject car : RCCar;
    }

    requirement def RangeReq {
        doc /* The transmitter shall maintain control at distances up to 100 metres */
        subject car : RCCar;
        require constraint {
            car.controlRange >= 100.0
        }
    }

    requirement def DurabilityReq {
        doc /* The chassis shall withstand impacts at speeds up to 30 km/h */
        subject car : RCCar;
    }

    // ─── Use Cases ─────────────────────────────────────────────────

    use case def DriveRCCar {
        actor operator : Driver;
        subject car : RCCar;

        objective {
            doc /* Navigate the RC car around a track or open area using the transmitter */
        }
    }

    use case def RaceRCCar :> DriveRCCar {
        objective {
            doc /* Complete a timed lap around a designated course in minimum time */
        }
    }

    // ─── Actions ───────────────────────────────────────────────────

    action def Accelerate {
        in throttle : Real;
        out speed : Real;
    }

    action def Steer {
        in angle : Real;
    }

    action def Brake {
        out speed : Real;
    }

    // ─── State Machine ─────────────────────────────────────────────

    state def CarOperationStates {
        entry; then idle;

        state idle;
        state driving;
        state braking;
        state charging;

        transition idle_to_driving
        first idle
        accept Accelerate
        then driving;

        transition driving_to_braking
        first driving
        accept Brake
        then braking;

        transition braking_to_idle
        first braking
        then idle;

        transition idle_to_charging
        first idle
        then charging;

        transition charging_to_idle
        first charging
        then idle;
    }

    // ─── Activity: Drive Session ───────────────────────────────────
    // Models the end-to-end flow of a typical driving session
    // from power-on through driving to shutdown.

    action def PowerOn {
        out batteryOk : Boolean;
        out receiverLinked : Boolean;
    }

    action def LinkTransmitter {
        out linked : Boolean;
        out signalStrength : Real;
    }

    action def Drive {
        in throttleInput : Real;
        in steeringInput : Real;
        out currentSpeed : Real;
    }

    action def MonitorBattery {
        in voltage : Real;
        out lowBattery : Boolean;
    }

    action def PowerOff {
        out shutdown : Boolean;
    }

    action driveSession {
        doc /* Complete driving session from power-on to shutdown */

        first start;

        then action powerOn : PowerOn {
            out batteryOk : Boolean;
            out receiverLinked : Boolean;
        }

        then action link : LinkTransmitter {
            out linked : Boolean;
            out signalStrength : Real;
        }

        then if (linked) {
            action drive : Drive {
                in throttleInput : Real;
                in steeringInput : Real;
                out currentSpeed : Real;
            }

            then action monitor : MonitorBattery {
                in voltage : Real;
                out lowBattery : Boolean;
            }

            then if (lowBattery) {
                action returnToBase {
                    out arrived : Boolean;
                }
            } else {
            action continueDriving {
                out keepGoing : Boolean;
            }
        }
    } else {
    action retryLink {
        out retryResult : Boolean;
    }
}

then action shutdown : PowerOff {
    out shutdown : Boolean;
}

then done;
}

// ─── Activity: Throttle-to-Wheel Flow ──────────────────────────
// Models the signal path from throttle input to wheel rotation.

action def DecodeSignal {
    in pwmSignal : Real;
    out throttlePercent : Real;
}

action def RegulateMotor {
    in throttlePercent : Real;
    in batteryVoltage : Real;
    out motorCurrent : Real;
}

action def SpinMotor {
    in motorCurrent : Real;
    out rpm : Real;
}

action def TransmitTorque {
    in rpm : Real;
    out wheelSpeed : Real;
}

action throttleToWheel {
    doc /* Signal flow from transmitter throttle to wheel rotation */

    first start;

    then action decode : DecodeSignal {
        in pwmSignal : Real;
        out throttlePercent : Real;
    }

    then action regulate : RegulateMotor {
        in throttlePercent : Real;
        in batteryVoltage : Real;
        out motorCurrent : Real;
    }

    then fork;
    then action spinFront : SpinMotor {
        in motorCurrent : Real;
        out rpm : Real;
    }
    then action spinRear : SpinMotor {
        in motorCurrent : Real;
        out rpm : Real;
    }
    join;

    then action transmit : TransmitTorque {
        in rpm : Real;
        out wheelSpeed : Real;
    }

    then done;
}

// ─── Activity: Steering Flow ───────────────────────────────────
// Models the steering signal path from transmitter to servo.

action def DecodeSteeringSignal {
    in pwmSignal : Real;
    out steeringAngle : Real;
}

action def ActuateServo {
    in targetAngle : Real;
    out actualAngle : Real;
}

action def AdjustWheelAngle {
    in servoAngle : Real;
    out frontWheelAngle : Real;
}

action steeringFlow {
    doc /* Signal flow from steering input to front wheel angle */

    first start;

    then action decodeSteer : DecodeSteeringSignal {
        in pwmSignal : Real;
        out steeringAngle : Real;
    }

    then action actuate : ActuateServo {
        in targetAngle : Real;
        out actualAngle : Real;
    }

    then action adjustWheels : AdjustWheelAngle {
        in servoAngle : Real;
        out frontWheelAngle : Real;
    }

    then done;
}

// ─── Sequence: Acceleration Command ────────────────────────────
// Models the interaction between driver, transmitter, receiver,
// ESC, and motor during an acceleration command.

part def AccelerationSequence {
    doc /* Sequence of interactions for a throttle command */

    part driver : Driver;
    part transmitter : Transmitter;
    part receiver : Receiver;
    part esc : ESC;
    part motor : Motor;
    part battery : Battery;

    // Driver pushes throttle on transmitter
    flow throttleInput from driver to transmitter;

    // Transmitter encodes and sends radio signal
    occurrence sendRadioSignal;
    flow radioSignal from transmitter to receiver;

    // Receiver decodes PWM signal to ESC
    occurrence decodePWM;
    flow pwmSignal from receiver to esc;

    // ESC regulates current from battery to motor
    flow powerRequest from esc to battery;
    flow regulatedCurrent from battery to esc;
    flow motorDrive from esc to motor;

    // Motor produces rotation
    occurrence motorSpin;
}

// ─── Sequence: Steering Command ────────────────────────────────
// Models the interaction for a steering command from driver
// through to the steering servo.

part def SteeringSequence {
    doc /* Sequence of interactions for a steering command */

    part driver : Driver;
    part transmitter : Transmitter;
    part receiver : Receiver;
    part steeringServo : SteeringServo;

    // Driver turns steering wheel on transmitter
    flow steeringInput from driver to transmitter;

    // Transmitter sends radio signal
    occurrence sendSteeringSignal;
    flow steeringRadioSignal from transmitter to receiver;

    // Receiver sends PWM to servo
    occurrence decodeSteeringPWM;
    flow servoPWM from receiver to steeringServo;

    // Servo actuates
    occurrence servoActuation;
}

// ─── Sequence: Emergency Stop ──────────────────────────────────
// Models the interaction flow when the driver triggers
// an emergency stop.

part def EmergencyStopSequence {
    doc /* Sequence of interactions for an emergency stop */

    part driver : Driver;
    part transmitter : Transmitter;
    part receiver : Receiver;
    part esc : ESC;
    part motor : Motor;
    part steeringServo : SteeringServo;

    // Driver releases throttle and pulls brake trigger
    flow brakeInput from driver to transmitter;

    // Transmitter sends brake signal
    occurrence sendBrakeSignal;
    flow brakeRadioSignal from transmitter to receiver;

    // Receiver dispatches to ESC and servo simultaneously
    occurrence decodeBrakeSignal;
    flow brakePWM from receiver to esc;
    flow neutralSteeringPWM from receiver to steeringServo;

    // ESC reverses motor briefly for braking
    flow reverseCurrent from esc to motor;
    occurrence motorBrake;

    // Servo returns to neutral
    occurrence servoReturnToNeutral;
}

// ─── Example Instance ──────────────────────────────────────────

part myRCCar : RCCar {
    :>> chassis {
        :>> length = 450.0;
        :>> width = 250.0;
        :>> material = "Carbon Fibre";
        :>> mass = 0.8;
    }

    :>> frontMotor {
        :>> kv = 3200.0;
        :>> maxRPM = 25000.0;
        :>> mass = 0.15;
    }

    :>> rearMotor {
        :>> kv = 3200.0;
        :>> maxRPM = 25000.0;
        :>> mass = 0.15;
    }

    :>> battery {
        :>> cellCount = 3;
        :>> capacityMah = 5000.0;
        :>> voltage = 11.1;
        :>> mass = 0.35;
    }

    :>> servo {
        :>> torque = 15.0;
        :>> speed = 0.06;
        :>> mass = 0.05;
    }

    :>> mass = 2.8;
    :>> topSpeed = 65.0;
    :>> controlRange = 150.0;
}

part myTransmitter : Transmitter {
    :>> channels = 3;
    :>> range = 200.0;
}
}
