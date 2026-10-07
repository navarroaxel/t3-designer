"""The smart one-piece toilet of the owner's pictures: an egg-shaped white body with no cistern, narrower at the floor; a seat and a closed lid on it, and at the back a housing
with a dark glass control panel on top and a round blue light on its side. Units in metres; 480 mm wide, 770 mm long and 580 mm tall.

Axes in Blender: X is the width, Y the length (the back, against the wall, is +Y; the front is -Y, which the exporter turns into +Z) and Z the height; it stands on the floor at Z = 0, centred.
The light is on the +X side.
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
        shader.inputs['Emission Strength'].default_value = 4
    return item


def build(request, _default_material):
    import bpy
    import bmesh
    from mathutils import Vector

    ceramic = paint(bpy, 'Ceramic', '#f5f6f6', .12)
    seat = paint(bpy, 'Seat', '#f7f6f2', .22)
    glass = paint(bpy, 'Control glass', '#1b1c20', .08)
    cyan = paint(bpy, 'Light', '#59d0e8', .3, emission=(.2, .8, 1))
    chrome = paint(bpy, 'Chrome', '#c8ccd0', .2, .9)
    water = paint(bpy, 'Water', '#cfe3ee', .05)
    parts = []
    length, width, height = .77, .48, .58
    half_l, half_w = length / 2, width / 2

    def egg(z, scale, grow=0.0, front=1.0, back=1.0, exponent=2.6, count=64):
        """A ring: a superellipse, rounder at the front (-Y) than the back (+Y), scaled; `grow` pads it by that many metres."""
        ring = []
        for index in range(count):
            angle = 2 * math.pi * index / count
            c, s = math.cos(angle), math.sin(angle)
            x = math.copysign(abs(c) ** (2 / exponent), c) * (half_w * scale + grow)
            along = math.copysign(abs(s) ** (2 / exponent), s)
            y = along * ((half_l * scale + grow) * (front if along < 0 else back))
            ring.append((x, y, z))
        return ring

    def lofted(name, finish_material, rings, caps=(True, True), bevel=0):
        mesh = bmesh.new()
        loops = [[mesh.verts.new(point) for point in ring] for ring in rings]
        for lower, upper in zip(loops, loops[1:]):
            for index in range(len(lower)):
                nxt = (index + 1) % len(lower)
                mesh.faces.new((lower[index], lower[nxt], upper[nxt], upper[index]))
        if caps[0]:
            mesh.faces.new(loops[0][::-1])
        if caps[1]:
            mesh.faces.new(loops[-1])
        bmesh.ops.recalc_face_normals(mesh, faces=list(mesh.faces))
        data = bpy.data.meshes.new(name)
        mesh.to_mesh(data)
        mesh.free()
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        if bevel:
            soft = obj.modifiers.new('Soft edges', 'BEVEL')
            soft.width = bevel
            soft.segments = 3
            bpy.ops.object.modifier_apply(modifier=soft.name)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        obj.data.materials.append(finish_material)
        parts.append(obj)
        return obj

    def prim(obj, finish_material, bevel=0):
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        if bevel:
            soft = obj.modifiers.new('Soft edges', 'BEVEL')
            soft.width = bevel
            soft.segments = 2
            bpy.ops.object.modifier_apply(modifier=soft.name)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        obj.data.materials.append(finish_material)
        parts.append(obj)

    # The body: from a small footprint (the taper) swelling out to the full egg at 0.3 m and drawing in a little to the seat at 0.5 m.
    profile = [(0, .86), (.02, .88), (.08, .94), (.2, .99), (.32, 1.0), (.44, .985), (.5, .965)]
    lofted('Body', ceramic, [egg(z, scale) for z, scale in profile], (True, True), .004)
    # The seat: a ring on the body, a little wider than it, with its opening; the lid closes it.
    outer0, outer1 = egg(.5, 1, .008), egg(.535, 1, .008)
    inner0, inner1 = egg(.5, .62, 0, .8, .55), egg(.535, .62, 0, .8, .55)
    mesh = bmesh.new()
    rings = [[mesh.verts.new(p) for p in ring] for ring in (outer0, outer1, inner1, inner0)]
    for a, b in ((0, 1), (1, 2), (2, 3), (3, 0)):
        for index in range(len(outer0)):
            nxt = (index + 1) % len(outer0)
            mesh.faces.new((rings[a][index], rings[a][nxt], rings[b][nxt], rings[b][index]))
    bmesh.ops.recalc_face_normals(mesh, faces=list(mesh.faces))
    data = bpy.data.meshes.new('Seat')
    mesh.to_mesh(data)
    mesh.free()
    seat_obj = bpy.data.objects.new('Seat', data)
    bpy.context.collection.objects.link(seat_obj)
    prim(seat_obj, seat, .004)
    # The bowl under the opening and its water.
    lofted('Bowl', ceramic, [egg(.5, .62, 0, .8, .55), egg(.43, .5, 0, .8, .55), egg(.38, .3, 0, .8, .55)], (False, True))
    lofted('Water', water, [egg(.405, .34, 0, .8, .55), egg(.408, .34, 0, .8, .55)], (True, True))
    # The lid: closed on the seat, a shallow dome from the front to the housing.
    lofted('Lid', seat, [egg(.535, 1, .008, 1, .8), egg(.552, .985, .005, 1, .78), egg(.568, .9, 0, 1, .74), egg(.575, .78, 0, 1, .7)], (True, True), .003)
    # The housing at the back, white, with the dark glass on top and the blue light ring on the +X side.
    for name, finish_material, x, y, z, bevel in (
        ('Housing', seat, (-.17, .17), (.09, .37), (.5, .575), .035),
        ('Control glass', glass, (-.1, .1), (.13, .34), (.575, .58), .001),
    ):
        bpy.ops.mesh.primitive_cube_add(size=1, location=((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2))
        obj = bpy.context.object
        obj.name = name
        obj.dimensions = (x[1] - x[0], y[1] - y[0], z[1] - z[0])
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        prim(obj, finish_material, bevel)
    for name, finish_material, radius, depth, x in (('Light ring', cyan, .022, .006, .172), ('Light button', chrome, .016, .008, .174)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius, depth=depth, location=(x, .14, .54))
        obj = bpy.context.object
        obj.name = name
        obj.rotation_euler = (0, math.pi / 2, 0)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        prim(obj, finish_material)
    # The side vents: slim slots on the -X side of the housing.
    for index in range(3):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(-.171, .2 + index * .03, .54))
        obj = bpy.context.object
        obj.name = f'Vent {index}'
        obj.dimensions = (.002, .018, .004)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        prim(obj, glass)

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
        'recipe': 'toilet', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
