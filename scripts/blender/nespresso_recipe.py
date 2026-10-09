"""The kitchen's coffee machine, from a Nespresso Vertuo Next: a tall black body with the water tank standing at the back, a head over the cup space with its chrome lever on top and the
capsule slot under it, a drip tray with a grille in front. Units in metres; 142 mm wide, 314 mm tall and 426 mm deep (the maker's figures).

Axes in Blender: X is the width, Y the depth (the front, toward the room, is -Y, which the exporter turns into +Z) and Z the height; the machine stands on its tray at Z = 0, centred.
"""
from __future__ import annotations

import hashlib
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
    black = paint(bpy, 'Body black', '#18191b', .32, .1)
    tank = paint(bpy, 'Tank', '#2b2d31', .25, .1)
    tray = paint(bpy, 'Tray', '#26272a', .5, .2)
    grille = paint(bpy, 'Grille', '#0e0f10', .6, .3)
    chrome = paint(bpy, 'Chrome', '#d2d5d9', .2, .95)
    light = paint(bpy, 'Light', '#f1f4f8', .3, emission=(.9, .95, 1))
    parts = []
    half, front, back = w / 2, -d / 2, d / 2

    def box(name, finish, x, y, z, bevel=.003):
        bpy.ops.mesh.primitive_cube_add(size=1, location=((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2))
        obj = bpy.context.object
        obj.name = name
        obj.dimensions = (x[1] - x[0], y[1] - y[0], z[1] - z[0])
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        size = min(x[1] - x[0], y[1] - y[0], z[1] - z[0])
        if bevel and size > .004:
            soft = obj.modifiers.new('Soft edges', 'BEVEL')
            soft.width = min(bevel, size / 3)
            soft.segments = 3
            bpy.ops.object.modifier_apply(modifier=soft.name)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        obj.data.materials.append(finish)
        parts.append(obj)

    tray_top = .03
    # The drip tray, out in front, with its grille.
    box('Tray', tray, (-half, half), (front, front + .21), (0, tray_top), .004)
    box('Grille', grille, (-half + .012, half - .012), (front + .02, front + .19), (tray_top, tray_top + .004), .001)
    # The body, behind the cup space: a tall column; the water tank stands against its back and rises to the top.
    box('Body', black, (-half, half), (back - .2, back - .09), (tray_top, h * .86), .008)
    box('Tank', tank, (-half + .004, half - .004), (back - .095, back), (tray_top, h), .01)
    # The head over the cup space, reaching forward, with the capsule slot under its front and the lever on top.
    box('Head', black, (-half, half), (front + .06, back - .09), (h * .56, h * .86), .01)
    box('Head cap', black, (-half, half), (front + .06, back - .09), (h * .86, h * .9), .008)
    box('Lever', chrome, (-.028, .028), (front + .12, front + .26), (h * .9, h * .945), .006)
    box('Slot', grille, (-.03, .03), (front + .06 - .004, front + .1), (h * .56 - .002, h * .56 + .016), .001)
    box('Spout', chrome, (-.012, .012), (front + .08, front + .12), (h * .56 - .02, h * .56), .004)
    # The light ring on the front of the head.
    box('Light', light, (-.05, .05), (front + .06 - .003, front + .06), (h * .74, h * .75), .0005)

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
        'recipe': 'nespresso', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
