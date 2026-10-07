"""A height-adjustable standing desk, from the owner's picture: a light wood top on two white telescopic legs with T feet, a cable tray and the control box under the top. Units in metres; 1.40 m
wide, 0.70 m deep, 0.75 m tall (its lowest position, the usual seated height).

Axes in Blender: X is the width, Y the depth (the sitter's side, the front, is -Y, which the exporter turns into +Z) and Z the height; it stands on the floor at Z = 0, centred.
"""
from __future__ import annotations

import hashlib
from pathlib import Path


def paint(bpy, name, color, roughness, metallic=0):
    item = bpy.data.materials.new(name)
    item.use_nodes = True
    srgb = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in srgb]
    item.diffuse_color = (*linear, 1)
    shader = item.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    return item


def build(request, _default_material):
    import bpy
    from mathutils import Vector

    wood = paint(bpy, 'Top', '#dcb67f', .55)
    edge = paint(bpy, 'Top edge', '#cfa66c', .55)
    white = paint(bpy, 'Leg white', '#f1f2f1', .4)
    foot = paint(bpy, 'Foot end', '#222326', .6)
    black = paint(bpy, 'Black', '#1a1b1d', .5)
    tray = paint(bpy, 'Tray', '#3b3d41', .45, .6)
    parts = []
    w, d, h = 1.4, .7, .75
    top = .025

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

    half = w / 2
    box('Top', wood, (-half, half), (-d / 2, d / 2), (h - top, h), .006)
    # Two legs set in from the ends: an outer column and a slimmer inner one that telescopes out of it, on a T foot (a bar across the depth, with dark end caps).
    for side in (-1, 1):
        x = side * (half - .09)
        box(f'Foot {side}', white, (x - .03, x + .03), (-.3, .3), (0, .04), .008)
        box(f'Foot cap {side} a', foot, (x - .03, x + .03), (-.3, -.296), (0, .04), .002)
        box(f'Foot cap {side} b', foot, (x - .03, x + .03), (.296, .3), (0, .04), .002)
        box(f'Leg outer {side}', white, (x - .03, x + .03), (-.03, .03), (.04, .42), .006)
        box(f'Leg inner {side}', white, (x - .025, x + .025), (-.025, .025), (.42, h - top - .02), .004)
        box(f'Bracket {side}', white, (x - .045, x + .045), (-.19, .19), (h - top - .03, h - top), .004)
    # Under the top: the cable tray along the back and the control box beside the right leg.
    box('Cable tray', tray, (-.3, .3), (.2, .3), (h - top - .06, h - top - .02), .003)
    box('Control box', black, (.2, .45), (-.1, .08), (h - top - .06, h - top), .004)
    # The cable the box sends to the left leg, along the back bracket.
    box('Cable', black, (-half + .09, .2), (.19, .205), (h - top - .045, h - top - .035), .001)

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
        'recipe': 'desk', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
