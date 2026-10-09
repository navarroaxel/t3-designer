"""The kitchen's microwave, from the owner's picture: a Samsung grill microwave in black. The front, seen from the room, is a large glass door on the left (dark, with the mesh window of the cavity and a
vertical grey handle on its right edge) and, beside it, the control panel: a blue display, four rows of two buttons, the steel dial and the two buttons of stop and start. Units in metres.

Axes in Blender: X is the width, Y the depth (the front is -Y, which the exporter turns into +Z) and Z the height; it stands on its base at Z = 0, centred. Positions on the front are read from the picture as
fractions of its width and height.
"""
from __future__ import annotations

import hashlib
import math
from pathlib import Path


def paint(bpy, name, color, roughness, metallic=0, emission=None):
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
        shader.inputs['Emission Strength'].default_value = 3
    return item


def build(request, _default_material):
    import bpy
    from mathutils import Vector

    w, h, d = request['dimensions']
    body_black = paint(bpy, 'Body black', '#0c0d0f', .3, .1)
    glass = paint(bpy, 'Door glass', '#050607', .08, .2)
    mesh_grey = paint(bpy, 'Cavity mesh', '#17181b', .8)
    handle_grey = paint(bpy, 'Handle', '#45474c', .35, .7)
    key = paint(bpy, 'Key', '#26282c', .5, .1)
    steel = paint(bpy, 'Dial steel', '#c9ccd0', .25, .9)
    blue = paint(bpy, 'Display', '#3aa0ff', .3, emission=(.1, .45, 1))
    logo = paint(bpy, 'Logo', '#c5c8cc', .4, .5)
    parts = []
    front = -d / 2
    protrusion = .016

    def box(name, finish, x, y, z, bevel=.002):
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
        obj.data.materials.append(finish)
        parts.append(obj)

    def fx(fraction):
        return (fraction - .5) * w

    def fz(fraction):
        return h * (1 - fraction)

    body_front = front + protrusion
    box('Body', body_black, (-w / 2, w / 2), (body_front, d / 2), (0, h), .008)
    # The door: a sheet of glass over the left of the front, with the cavity's mesh window and the handle on its right edge.
    box('Door', glass, (fx(.04), fx(.78)), (body_front - .006, body_front), (fz(.96), fz(.09)), .004)
    box('Window', mesh_grey, (fx(.14), fx(.65)), (body_front - .008, body_front - .006), (fz(.78), fz(.30)), .001)
    box('Handle', handle_grey, (fx(.735), fx(.78)), (front, body_front - .006), (fz(.97), fz(.12)), .004)
    # The control panel: the display, four rows of two keys, the dial with its mark, and the stop and start keys.
    box('Display', blue, (fx(.846), fx(.923)), (body_front - .002, body_front), (fz(.25), fz(.19)), .001)
    for row, fraction in enumerate((.347, .411, .475, .539)):
        for column, (a, b) in enumerate(((.82, .878), (.882, .945))):
            box(f'Key {row}-{column}', key, (fx(a), fx(b)), (body_front - .005, body_front), (fz(fraction) - .004, fz(fraction) + .004), .001)
    for column, (a, b) in enumerate(((.82, .878), (.882, .945))):
        box(f'Start key {column}', key, (fx(a), fx(b)), (body_front - .005, body_front), (fz(.843) - .004, fz(.843) + .004), .001)
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=.0145, depth=.016, location=(fx(.878), body_front - .007, fz(.704)), rotation=(math.pi / 2, 0, 0))
    dial = bpy.context.object
    dial.name = 'Dial'
    for polygon in dial.data.polygons:
        polygon.use_smooth = True
    dial.data.materials.append(steel)
    parts.append(dial)
    box('Dial mark', body_black, (fx(.878) - .0008, fx(.878) + .0008), (front, front + .002), (fz(.704) + .004, fz(.704) + .013), 0)
    box('Logo', logo, (fx(.44), fx(.54)), (body_front - .008, body_front - .006), (fz(.905), fz(.885)), .0005)

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
        'recipe': 'microwave', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
