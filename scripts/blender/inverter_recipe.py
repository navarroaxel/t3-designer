"""The owner's Deye three-phase hybrid inverter (SUN-10K-SG05LP3-EU-SM2), from the maker's picture. Units in metres; 386 mm wide, 250 mm deep and 720 mm tall: the 660 mm body and the 60 mm of
connectors under it.

Seen from the front: a white body with big rounded corners, a lower cover under a seam, a black square panel with the Deye name, the colour screen and four round buttons (Up, Esc, Enter,
Down); the DC isolator switch, black, on the left side; and under the body a big cable gland, four DC connectors and three round glands. Axes in Blender: X is the width (the switch is on
-X), Y the depth (the front is -Y, which the exporter turns into +Z) and Z the height; it hangs with its connectors' bottom at Z = 0, centred.
"""
from __future__ import annotations

import hashlib
import math
from pathlib import Path

PX_X = .386 / 597
PX_Z = .66 / 985


def paint(bpy, name, color, roughness, metallic=0, emission=None, strength=2):
    item = bpy.data.materials.new(name)
    item.use_nodes = True
    srgb = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in srgb]
    item.diffuse_color = (*linear, 1)
    shader = item.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    if emission:
        shader.inputs['Emission Color'].default_value = (*emission, 1)
        shader.inputs['Emission Strength'].default_value = strength
    return item


def build(request, _default_material):
    import bpy
    from mathutils import Vector

    white = paint(bpy, 'Body white', '#f2f3f4', .42)
    black = paint(bpy, 'Black plastic', '#1a1b1d', .5)
    panel = paint(bpy, 'Panel', '#26272a', .35)
    screen = paint(bpy, 'Screen', '#e8efe8', .2, emission=(.75, .85, .75), strength=.6)
    green = paint(bpy, 'Green', '#35c46a', .3, emission=(.1, .9, .3), strength=2)
    red = paint(bpy, 'Red', '#d94040', .3, emission=(.9, .15, .15), strength=1.5)
    button = paint(bpy, 'Button', '#3a3b3f', .5)
    parts = []
    top, base = .72, .06
    half_w, half_d = .193, .121
    panel_z = top - .493 * .66

    def finish(obj, finish_material, bevel=0, segments=3):
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        if bevel:
            soft = obj.modifiers.new('Soft edges', 'BEVEL')
            soft.width = bevel
            soft.segments = segments
            bpy.ops.object.modifier_apply(modifier=soft.name)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        obj.data.materials.append(finish_material)
        parts.append(obj)

    def box(name, finish_material, x, y, z, bevel=.002, segments=3):
        bpy.ops.mesh.primitive_cube_add(size=1, location=((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2))
        obj = bpy.context.object
        obj.name = name
        obj.dimensions = (x[1] - x[0], y[1] - y[0], z[1] - z[0])
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        finish(obj, finish_material, min(bevel, min(x[1] - x[0], y[1] - y[0], z[1] - z[0]) / 3), segments)

    def disc(name, finish_material, x, z, radius, y0, y1, bevel=0):
        """A round plate or ring facing the front (-Y), from y0 to y1."""
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius, depth=y1 - y0, location=(x, (y0 + y1) / 2, z))
        obj = bpy.context.object
        obj.name = name
        obj.rotation_euler = (math.pi / 2, 0, 0)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        finish(obj, finish_material, bevel)

    def post(name, finish_material, x, y, radius, z0, z1):
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=z1 - z0, location=(x, y, (z0 + z1) / 2))
        obj = bpy.context.object
        obj.name = name
        finish(obj, finish_material, .001)

    body_x = (-half_w + .018, half_w)
    seam = top - .726 * .66
    # The body and the lower cover (one body with the seam drawn across it).
    box('Body', white, body_x, (-half_d, half_d), (base, top), .035, 6)
    box('Seam', paint(bpy, 'Seam', '#b9bcc0', .5), (body_x[0] + .004, body_x[1] - .004), (-half_d - .0012, -half_d), (seam - .0008, seam + .0008), .0003, 1)
    # The black panel and what is on it: the name, the screen with its four dials, the buttons.
    cx = (body_x[0] + body_x[1]) / 2
    box('Panel', panel, (cx - .069, cx + .069), (-half_d - .004, -half_d + .002), (panel_z - .072, panel_z + .072), .004)
    sc_z = panel_z + 23 * PX_Z
    box('Screen', screen, (cx - .038, cx + .038), (-half_d - .0055, -half_d - .003), (sc_z - .026, sc_z + .026), .001)
    for dx, dz, finish_material in ((-.022, .012, red), (.022, .012, green), (-.022, -.012, green), (.022, -.012, green)):
        disc('Dial', finish_material, cx + dx, sc_z + dz, .0085, -half_d - .0068, -half_d - .0055)
    for name, dx, dz in (('Up', 0, -.0295), ('Esc', -.0225, -.0442), ('Enter', .0238, -.0442), ('Down', 0, -.0576)):
        disc(f'Button {name}', button, cx + dx, panel_z + dz, .0085, -half_d - .0075, -half_d - .003, .001)
    bpy.ops.object.text_add(location=(cx, -half_d - .0045, panel_z + .0596))
    text = bpy.context.object
    text.name = 'Name'
    text.data.body = 'Deye'
    text.data.size = .014
    text.data.align_x = 'CENTER'
    text.data.align_y = 'CENTER'
    text.data.extrude = .0004
    text.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.object.convert(target='MESH')
    text = bpy.context.object
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    finish(text, white, 0)
    # The DC isolator, a black rotary switch on the left side, just above the seam.
    box('Isolator', black, (-half_w, -half_w + .022), (-half_d + .005, -half_d + .075), (seam, seam + .045), .006)
    # Underneath: the big gland on the left, four DC connectors, three round glands.
    post('Big gland', black, -.102, -.03, .033, 0, base + .004)
    for index in range(4):
        post(f'DC {index}', black, -.052 + index * .0175, -.03, .0085, 0, base + .004)
    for x in (.049, .087, .128):
        post('Gland', black, x, -.03, .0175, 0, base + .004)

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
        'recipe': 'inverter', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
