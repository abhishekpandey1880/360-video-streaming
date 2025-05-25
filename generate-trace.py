import csv
import random
import math

def random_unit_vector():
    """Generate a random unit vector on a sphere."""
    theta = random.uniform(0, 2 * math.pi)      # azimuthal angle
    phi = random.uniform(0, math.pi)            # polar angle

    x = math.sin(phi) * math.cos(theta)
    y = math.sin(phi) * math.sin(theta)
    z = math.cos(phi)

    return x, y, z

# Parameters
duration_sec = 30
interval_sec = 0.2

with open("camera_trace.csv", "w", newline='') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(["time", "x", "y", "z"])
    time = 0.0
    while time <= duration_sec:
        x, y, z = random_unit_vector()
        writer.writerow([round(time, 2), round(x, 4), round(y, 4), round(z, 4)])
        time += interval_sec
