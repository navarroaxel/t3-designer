"""The kitchen's bar stool, from the owner's pictures: a Tolix-style stool in gloss black pressed steel with a low back. Four tapered legs that splay out toward the floor, a square pressed seat with a
rolled edge and a hand slot at the back, two rails for the feet (a ring at mid height and a lower rung at the front and the back), and a low back: a round rod bent into a U, fixed to the seat at both
ends, with a pressed plate in the middle bolted to the seat's edge with two chrome rivets. Units in metres; 0.40 m wide and deep, 0.85 m tall (the seat at 0.65 m).

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
    import bmesh
    from mathutils import Vector

    w, h, d = request['dimensions']
    black = paint(bpy, 'Gloss black steel', '#0d0e10', .22, .55)
    chrome = paint(bpy, 'Chrome', '#d6d9dc', .15, 1)
    parts = []
    half, back = w / 2, d / 2
    seat_top = h * .765
    seat_thick = .045

    def link(name, mesh, finish):
        data = bpy.data.meshes.new(name)
        mesh.to_mesh(data)
        mesh.free()
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        data.materials.append(finish)
        for polygon in data.polygons:
            polygon.use_smooth = True
        parts.append(obj)

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

    # The four legs: tapered, wider at the seat, splaying out toward the floor, each a square-sectioned loft from the seat's underside to the floor.
    legs = bmesh.new()
    for sx in (-1, 1):
        for sy in (-1, 1):
            top_c = (sx * (half - .038), sy * (back - .038), seat_top - seat_thick)
            foot_c = (sx * (half - .008), sy * (back - .008), 0)
            top_r, foot_r = .024, .014
            def square(centre, radius, z):
                return [legs.verts.new((centre[0] + dx * radius, centre[1] + dy * radius, z)) for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            upper, lower = square(top_c, top_r, top_c[2]), square(foot_c, foot_r, foot_c[2])
            for index in range(4):
                legs.faces.new((lower[index], lower[(index + 1) % 4], upper[(index + 1) % 4], upper[index]))
            legs.faces.new(lower[::-1])
    bmesh.ops.recalc_face_normals(legs, faces=legs.faces[:])
    link('Legs', legs, black)

    # The seat: a square pressed pan with a rolled edge and a hand slot at the back.
    box('Seat', black, (-half, half), (-back, back), (seat_top - seat_thick, seat_top), .008)
    box('Seat dish', black, (-half + .02, half - .02), (-back + .02, back - .02), (seat_top, seat_top + .003), .003)
    box('Hand slot', paint(bpy, 'Slot', '#030304', .6), (-.045, .045), (back - .09, back - .065), (seat_top + .002, seat_top + .0035), .001)

    # The footrests: a ring at mid height, and a lower rung at the front and the back.
    mid, low, bar = h * .33, h * .15, .011
    inner = half - .022
    for y in (-inner, inner):
        box('Mid rail', black, (-inner, inner), (y - bar / 2, y + bar / 2), (mid - bar / 2, mid + bar / 2), .004)
        box('Low rung', black, (-half + .012, half - .012), (y * 1.05 - bar / 2, y * 1.05 + bar / 2), (low - bar / 2, low + bar / 2), .004)
    for x in (-inner, inner):
        box('Mid side rail', black, (x - bar / 2, x + bar / 2), (-inner, inner), (mid - bar / 2, mid + bar / 2), .004)

    # The back: a rod bent into a U, up from both back corners of the seat and across, with the pressed plate in the middle, bolted to the seat's edge with two chrome rivets.
    rod = .012
    top_rod = h - rod
    for x in (-1, 1):
        box('Back upright', black, (x * (half - .02) - rod / 2, x * (half - .02) + rod / 2), (back - .03 - rod / 2, back - .03 + rod / 2), (seat_top, top_rod + rod), .004)
    box('Back rod', black, (-half + .02 - rod / 2, half - .02 + rod / 2), (back - .03 - rod / 2, back - .03 + rod / 2), (top_rod, top_rod + rod), .004)
    box('Back plate', black, (-.06, .06), (back - .016, back - .004), (seat_top - .06, seat_top + .16), .006)
    box('Back plate relief', black, (-.04, .04), (back - .004, back), (seat_top + .02, seat_top + .13), .005)
    for x in (-.04, .04):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=.0065, location=(x, back + .001, seat_top - .035))
        rivet = bpy.context.object
        rivet.name = 'Rivet'
        rivet.scale = (1, .5, 1)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        for polygon in rivet.data.polygons:
            polygon.use_smooth = True
        rivet.data.materials.append(chrome)
        parts.append(rivet)

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
        'recipe': 'stool', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
