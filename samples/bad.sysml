package MySystem {
    public import RealFunctions::;*
    part def Vehicle {
        attribute mass : Real;
        attribute fulltank : Boolean;
        attribute electric : Boolean;
    }
    part car : Vehicle;

    part bike : Vehicle {
        attribute hasCarrier : Boolean;
    }
}
