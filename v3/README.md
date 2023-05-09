# Fiðrildi 3

Fiðrildi 3 is a 34-key keyboard inspired by [Reviung](https://github.com/gtips/reviung) and [Corne](https://github.com/foostan/crkbd).

It is designed specifically for the [0xcb Helios](https://github.com/0xCB-dev/0xCB-Helios), and uses all available pins. The Helios is soldered in to minimize the profile so that it can be sandwiched between the top plate and bottom PCB.

The top plate is a PCB with artwork done on the soldermask layer so that it is silver. The artwork is duplicated on the back in silkscreen in case that aesthetic is preferable.

The PCB has 40 reverse-mounted SK6812-E LEDs that shine upwards through slots in the PCB. These illuminate an acrylic middle-layer from below and are visible at its edge.

There are 4-pin and 8-pin JST SH (1 mm) connectors on the top of the PCB for connecting extras (LCD, Cirque, etc.).

The column stagger is more exaggerated than the Corne, and the halves are tilted 8 degrees more than the Reviung.

![Picture of Fiðrildi 3 Keyboard](images/fidrildi3-comet-1.png)
![Picture of Fiðrildi 3 Keyboard](images/fidrildi3-comet-2.png)
![Picture of Underside of Fiðrildi 3 Keyboard](images/fidrildi3-comet-3.png)

## Issues with Version 3.0

  - "EXT5/10" silkscreen on J2 and J3 incorrect; should be "EXT5/14"
  - LED bottom silkscreen labels reversed
  - J1 pins can't be assigned for I2C0 or I2C1

## Improvements for Next Version

  - Fix issues described above.
  - Would be nice if LEDs could be set even further in from edge. It should make the edge light more uniform. Also, they shine through the side of the bottom PCB.
  - Add encoder footprints to bottom PCB?
  - Add GC9A01 cutout to top plate?
