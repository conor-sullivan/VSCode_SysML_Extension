/**
 * Simple Torch/Flashlight System
 * Demonstrates SysML v2.0 modeling with part definitions, actions,
 * state machines, and requirements.
 */

package TorchSystem {

    // ===== Part Definitions =====

    part def Torch {
        part battery : Battery;
        part switchButton : Switch;
        part ledBulb : LEDBulb;
        part reflector : Reflector;
        part housing : Housing;

        attribute isOn : Boolean;
        attribute batteryLevel : Real;
        attribute brightness : Real;
    }

    part def Battery {
        attribute capacity : Real;
        attribute charge : Real;
        attribute voltage : Real;
        attribute providing : Boolean;
    }

    part def Switch {
        attribute pressed : Boolean;
        attribute signalSent : Boolean;
    }

    part def LEDBulb {
        attribute powered : Boolean;
        attribute maxBrightness : Real;
        attribute currentBrightness : Real;
    }

    part def Reflector {
        attribute focusAngle : Real;
        attribute reflectivity : Real;
    }

    part def Housing {
        attribute material : String;
        attribute length : Real;
        attribute diameter : Real;
        attribute waterResistance : String;
    }

    part def User;
    part def Charger;

    // ===== Action Definitions =====

    action def TurnOnSequence {
        doc /* Sequence of operations when torch is turned on */

        in item user : User;
        out brightness : Real;

        action pressSwitch;
        action activateCircuit;
        action checkBattery;
        action powerLED;
        action produceLight;

        first pressSwitch;
        then activateCircuit;
        then checkBattery;
        then powerLED;
        then produceLight;
    }

    action def TurnOffSequence {
        doc /* Sequence of operations when torch is turned off */

        in item user : User;

        action releaseSwitch;
        action deactivateCircuit;
        action stopPowerToLED;
        action stopLight;

        first releaseSwitch;
        then deactivateCircuit;
        then stopPowerToLED;
        then stopLight;
    }

    action def DrainBattery {
        doc /* Battery consumption during operation */

        in drainRate : Real;
        out remainingCharge : Real;

        action consumePower;
        action checkDepletionLevel;

        first consumePower;
        then checkDepletionLevel;
    }

    action def RechargeBattery {
        doc /* Battery recharging sequence */

        in item charger : Charger;
        out finalCharge : Real;

        action connectCharger;
        action transferEnergy;
        action disconnectCharger;

        first connectCharger;
        then transferEnergy;
        then disconnectCharger;
    }

    // ===== State Definitions =====

    state def TorchStates {
        doc /* Operating states of the torch system */

        entry action initTorch;

        state off;
        state on;
        state lowBattery;
        state charging;

        transition first off then on;
        transition first on then off;
        transition first on then lowBattery;
        transition first lowBattery then off;
        transition first off then charging;
        transition first charging then off;
    }

    state def BatteryStates {
        doc /* Battery charge level states */

        state full;
        state nominal;
        state low;
        state depleted;

        transition first full then nominal;
        transition first nominal then low;
        transition first low then depleted;
        transition first depleted then full;
    }

    // ===== Port and Connection Definitions =====

    port def ElectricalPort {
        attribute voltage : Real;
        attribute current : Real;
    }

    port def LightPort {
        attribute intensity : Real;
        attribute wavelength : Real;
    }

    port def SignalPort {
        attribute signalLevel : Real;
    }

    connection def ElectricalConnection {
        doc /* Power delivery connection */
    }

    connection def SignalConnection {
        doc /* Control signal connection */
    }

    // ===== Constraint Definitions =====

    constraint def BatteryConstraint {
        doc /* Battery charge must remain within valid range */
    }

    constraint def BrightnessConstraint {
        doc /* Brightness proportional to battery and LED capability */
    }

    constraint def PowerConsumptionConstraint {
        doc /* Power draw must not exceed battery output capacity */
    }

    // ===== Requirement Definitions =====

    requirement def TorchRequirements {
        doc /* Top-level torch system requirements */

        requirement minBrightness {
            doc /* Torch must provide minimum 100 lumens */
            attribute minLumens : Real;
        }

        requirement batteryLife {
            doc /* Battery must last minimum 4 hours continuous use */
            attribute minHours : Real;
        }

        requirement waterResistance {
            doc /* Torch must be IPX4 water resistant */
            attribute ipRating : String;
        }

        requirement dropResistance {
            doc /* Torch must survive 1 meter drop onto concrete */
            attribute dropHeight : Real;
        }
    }

    requirement def SafetyRequirements {
        doc /* Safety requirements for torch operation */

        requirement thermalProtection {
            doc /* LED must not exceed 85 degrees C */
            attribute maxTemperature : Real;
        }

        requirement overDischargeProtection {
            doc /* Battery must shut off before damaging discharge level */
            attribute minVoltage : Real;
        }
    }

    // ===== Calculation Definitions =====

    calc def BrightnessCalculation {
        doc /* Calculate effective brightness output */
        in batteryCharge : Real;
        in maxLEDBrightness : Real;
        in reflectorEfficiency : Real;
        return effectiveBrightness : Real;
    }

    calc def BatteryLifeEstimate {
        doc /* Estimate remaining battery life */
        in currentCharge : Real;
        in drainRate : Real;
        return remainingHours : Real;
    }

    calc def PowerDraw {
        doc /* Calculate total power consumption */
        in ledPower : Real;
        in circuitOverhead : Real;
        return totalPower : Real;
    }

    // ===== Analysis Definitions =====

    analysis def ThermalAnalysis {
        doc /* Analyze heat generation during operation */
        subject torch : Torch;

        objective thermalSafety {
            doc /* Ensure temperatures stay within safe limits */
        }

        calc power : PowerDraw;
    }

    analysis def BatteryPerformanceAnalysis {
        doc /* Analyze battery discharge characteristics */
        subject torch : Torch;

        objective batteryEndurance {
            doc /* Evaluate battery life under various conditions */
        }

        calc life : BatteryLifeEstimate;
    }

    // ===== System Instance =====

    part myTorch : Torch {
        doc /* A concrete torch instance with specific configuration */
    }
}
