"""The pantry's wall-mounted network rack, from the owner's picture: a black sheet-steel cabinet with a smoked-glass door framed by two blue-lit stripes, a lock on the left, slotted vents on the
sides and perforated top and bottom, and inside, on the 19-inch rails, a 24-port patch panel, the UniFi Dream Machine Pro and three blanking plates. Units in metres; 482 mm wide, 318 mm deep
(300 mm of cabinet and 18 mm of door) and 287 mm tall (6U and its frame).

Axes in Blender: X is the width, Y the depth (the door's side, the front, is -Y, which the exporter turns into +Z) and Z the height; it stands with its bottom at Z = 0, centred.
"""
from __future__ import annotations

import hashlib
from pathlib import Path


def paint(bpy, name, color, roughness, metallic=0, alpha=1, emission=None):
    item = bpy.data.materials.new(name)
    item.use_nodes = True
    srgb = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in srgb]
    item.diffuse_color = (*linear, alpha)
    shader = item.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    if alpha < 1:
        shader.inputs['Alpha'].default_value = alpha
        item.blend_method = 'BLEND'
    if emission:
        shader.inputs['Emission Color'].default_value = (*emission, 1)
        shader.inputs['Emission Strength'].default_value = 2.5
    return item


def build(request, _default_material):
    import bpy
    from mathutils import Vector

    steel = paint(bpy, 'Black steel', '#16171a', .55, .3)
    vent = paint(bpy, 'Vent', '#050506', .8)
    glass = paint(bpy, 'Smoked glass', '#2a2f35', .1, alpha=.32)
    stripe = paint(bpy, 'Blue stripe', '#4fb4e8', .3, emission=(.2, .6, .9))
    lock = paint(bpy, 'Lock', '#c8ccd0', .25, .9)
    rail = paint(bpy, 'Rail', '#5b5f64', .4, .6)
    panel = paint(bpy, 'Patch panel', '#1d1f22', .5)
    port = paint(bpy, 'Port', '#08090a', .7)
    silver = paint(bpy, 'UDM Pro', '#c9ccd0', .4, .55)
    screen = paint(bpy, 'UDM screen', '#0b1020', .3, emission=(.1, .3, .9))
    parts = []
    w, d, h = .482, .318, .287
    unit = .0445
    half, front, rear = w / 2, -d / 2, d / 2
    door_back = front + .018

    def box(name, finish_material, x, y, z, bevel=.002):
        bpy.ops.mesh.primitive_cube_add(size=1, location=((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2))
        obj = bpy.context.object
        obj.name = name
        obj.dimensions = (x[1] - x[0], y[1] - y[0], z[1] - z[0])
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        size = min(x[1] - x[0], y[1] - y[0], z[1] - z[0])
        if bevel and size > .003:
            soft = obj.modifiers.new('Soft edges', 'BEVEL')
            soft.width = min(bevel, size / 3)
            soft.segments = 2
            bpy.ops.object.modifier_apply(modifier=soft.name)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        obj.data.materials.append(finish_material)
        parts.append(obj)

    # The cabinet: back plate, sides, top and bottom (the front is the door).
    t = .012
    box('Back', steel, (-half, half), (rear - .01, rear), (0, h), .002)
    box('Left', steel, (-half, -half + t), (door_back, rear), (0, h), .003)
    box('Right', steel, (half - t, half), (door_back, rear), (0, h), .003)
    box('Top', steel, (-half, half), (door_back, rear), (h - t, h), .003)
    box('Bottom', steel, (-half, half), (door_back, rear), (0, t), .003)
    # Slotted vents on both sides (a row of slim slits near the back) and on the top.
    for side in (-1, 1):
        for index in range(7):
            x = side * (half + .0005)
            box(f'Side vent {side} {index}', vent, (x - .001, x + .001), (rear - .1 + index * .008, rear - .1 + index * .008 + .003), (h - .075, h - .04), .0003)
    for index in range(8):
        box(f'Top vent {index}', vent, (-.12 + index * .03, -.12 + index * .03 + .018), (-.05, .08), (h - .0005, h + .0005), .0003)
    # The 19-inch rails and what sits on them: slots counted from the top, 10 mm under it.
    rail_x = .442 / 2
    box('Rail left', rail, (-rail_x - .005, -rail_x + .015), (door_back + .01, door_back + .03), (.012, h - .012), .001)
    box('Rail right', rail, (rail_x - .015, rail_x + .005), (door_back + .01, door_back + .03), (.012, h - .012), .001)

    def slot(n):
        return (h - .02 - n * unit, h - .02 - (n - 1) * unit)

    pitch = (.442 - .05) / 24
    z0, z1 = slot(1)
    box('Patch panel', panel, (-.221, .221), (door_back + .01, door_back + .045), (z0 + .001, z1 - .001), .001)
    for index in range(24):
        x = -.221 + .025 + index * pitch
        box(f'Port {index}', port, (x + .002, x + pitch - .002), (door_back + .0095, door_back + .0105), (z0 + .012, z1 - .012), .0003)
    z0, z1 = slot(2)
    box('UDM Pro', silver, (-.221, .221), (door_back + .01, door_back + .295), (z0 + .001, z1 - .001), .002)
    box('UDM screen', screen, (.221 - .09, .221 - .03), (door_back + .0095, door_back + .0105), (z0 + .012, z1 - .012), .0003)
    for n in (3, 4, 5):
        z0, z1 = slot(n)
        box(f'Blank {n}', steel, (-.221, .221), (door_back + .01, door_back + .014), (z0 + .001, z1 - .001), .001)
    # The door: a black frame, two blue stripes at the glass's edges, a smoked-glass pane, slanted vents on the side panels and the key lock on the left.
    box('Door top', steel, (-half, half), (front, door_back), (h - .035, h), .004)
    box('Door bottom', steel, (-half, half), (front, door_back), (0, .035), .004)
    box('Door left', steel, (-half, -half + .1), (front, door_back), (.035, h - .035), .004)
    box('Door right', steel, (half - .1, half), (front, door_back), (.035, h - .035), .004)
    box('Glass', glass, (-half + .1, half - .1), (front + .004, front + .008), (.035, h - .035), .001)
    for side in (-1, 1):
        box(f'Stripe {side}', stripe, (side * (half - .1) - .003 if side > 0 else -half + .1 - .003 + .006, side * (half - .1) + .003 if side > 0 else -half + .1 + .003 + .006), (front - .001, front + .001), (.04, h - .04), .0005)
        for index in range(3):
            x = side * (half - .05)
            box(f'Door vent {side} {index}', vent, (x - .014, x + .014), (front - .0005, front + .0005), (.065 + index * .06, .071 + index * .06), .0003)
    box('Lock', lock, (-half + .018, -half + .03), (front - .006, front), (h / 2 - .006, h / 2 + .006), .002)

    for obj in parts:
        obj.data.transform(obj.matrix_world)
        obj.matrix_world = obj.matrix_world.__class__.Identity(4)
    points = [vertex.co for obj in parts for vertex in obj.data.vertices]
    lower = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    upper = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    size = upper - lower
    target = Vector((request['dimensions'][0], request['dimensions'][2], request['dimensions'][1]))
    centre = Vector(((lower.x + upper.x) / 2, (lower.y + upper.y) / 2, lower.z))
    for obj in parts:
        for vertex in obj.data.vertices:
            vertex.co = Vector(tuple((vertex.co[i] - centre[i]) * target[i] / size[i] for i in range(3)))
        obj.data.update()
    return parts, {
        'recipe': 'rack', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
