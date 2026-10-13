"""The kitchen's bar stool, from the owner's pictures and sizes: a solid oak stool with a low ladder back and a sage-green upholstered seat. Four straight square legs, the two at the back running up to
make the back's uprights, an apron round under the seat, a rectangular footrest ring low down, a seat cushion that overhangs the apron a little, and two horizontal slats between the uprights. Units in metres;
0.41 m wide and deep (the seat) and 1.02 m tall, the seat at 0.75 m (the owner's picture).

Axes in Blender: X is the width, Y the depth (the front, the side one sits on, is -Y, which the exporter turns into +Z; the back is at +Y) and Z the height; it stands on its feet at Z = 0, centred.
"""
from __future__ import annotations

import hashlib
import math
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

    w, h, d = request['dimensions']
    oak = paint(bpy, 'Oak', '#d19653', .55)
    sage = paint(bpy, 'Sage upholstery', '#8d9c7c', .88)
    parts = []
    half, back = w / 2, d / 2

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

    # The frame is 2 cm in from the cushion's edge all round, and the legs 3.6 cm square at its corners.
    leg, frame = .036, half - .01
    centre = frame - leg / 2
    seat_frame_top, apron_height, seat_top = .70, .07, h * .75 / 1.02
    for sx in (-1, 1):
        for sy in (-1, 1):
            # The back legs go up to the top of the stool, as the back's uprights; the front ones to the apron.
            top = h if sy == 1 else seat_frame_top
            box('Leg', oak, (sx * centre - leg / 2, sx * centre + leg / 2), (sy * centre - leg / 2, sy * centre + leg / 2), (0, top), .003)

    # The apron under the cushion: four rails 2 cm thick, flush with the legs' outer faces.
    for sy in (-1, 1):
        box('Apron front/back', oak, (-frame, frame), (frame - .02, frame) if sy > 0 else (-frame, -frame + .02), (seat_frame_top - apron_height, seat_frame_top), .003)
    for sx in (-1, 1):
        box('Apron side', oak, (frame - .02, frame) if sx > 0 else (-frame, -frame + .02), (-frame, frame), (seat_frame_top - apron_height, seat_frame_top), .003)

    # The seat: the sage cushion, a soft slab over the apron, 1 cm out all round.
    box('Seat cushion', sage, (-half, half), (-back, back), (seat_frame_top, seat_top), .016)

    # The footrest ring, a rectangle of rungs between the legs low down.
    rung, rung_z = .024, .22
    inner = centre
    for sy in (-1, 1):
        box('Rung front/back', oak, (-inner, inner), (sy * inner - rung / 2, sy * inner + rung / 2), (rung_z - rung / 2, rung_z + rung / 2), .004)
    for sx in (-1, 1):
        box('Rung side', oak, (sx * inner - rung / 2, sx * inner + rung / 2), (-inner, inner), (rung_z - rung / 2, rung_z + rung / 2), .004)

    # The back: two slats between the uprights, 2 cm thick; the top one a little under the top of the uprights.
    slat = .02
    for bottom, top in ((h - .115, h - .045), (h - .205, h - .155)):
        box('Back slat', oak, (-inner + leg / 2, inner - leg / 2), (centre - slat / 2, centre + slat / 2), (bottom, top), .003)

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
        'recipe': 'stool', 'version': 2, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
