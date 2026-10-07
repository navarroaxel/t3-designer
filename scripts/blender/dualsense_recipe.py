"""The PlayStation 5 DualSense controller, lying flat on a table, built from the maker's pictures. Units in metres; 160 mm wide, 106 mm deep, 66 mm tall at the grips.

Seen from above (the picture's front view): a white shell with two splayed grips, a black centre between them under the sticks, the touchpad with a blue light along each side, the two
triggers on the far edge, the D-pad on the left and four buttons on the right. Axes in Blender: X is the width, Y the depth (the model's front, where the grips end, is -Y here, which
the exporter turns into +Z) and Z the height; it rests on the table at Z = 0, centred. Picture pixels (1100 px for the 160 mm) are turned into metres by K.
"""
from __future__ import annotations

import hashlib
import math
from pathlib import Path

K = .16 / 1100


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


def x_of(px):
    return (px - 600) * K


def y_of(py):
    # The picture's y grows toward the player (the grips); here that is -Y.
    return (399 - py) * K


def build(request, _default_material):
    import bpy
    import bmesh
    from mathutils import Vector

    white = paint(bpy, 'Shell white', '#f4f5f8', .38)
    black = paint(bpy, 'Black', '#16171a', .5)
    pad = paint(bpy, 'Touchpad', '#eef1f9', .3)
    grey = paint(bpy, 'Button grey', '#cfd3da', .35)
    blue = paint(bpy, 'Light blue', '#2c55ff', .3, emission=(.05, .15, 1))
    rubber = paint(bpy, 'Stick rubber', '#232428', .85)
    parts = []

    def select(obj):
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj

    def finish(obj, finish_material, bevel=0, smooth=True):
        select(obj)
        if bevel:
            soft = obj.modifiers.new('Soft edges', 'BEVEL')
            soft.width = bevel
            soft.segments = 3
            bpy.ops.object.modifier_apply(modifier=soft.name)
        if smooth:
            for polygon in obj.data.polygons:
                polygon.use_smooth = True
        obj.data.materials.append(finish_material)
        parts.append(obj)
        return obj

    def rounded_plate(name, finish_material, centre, size, roundness, z0, z1, bevel):
        """A plate whose outline is a superellipse, standing from z0 to z1."""
        exponent = 2 + 8 * roundness
        mesh = bmesh.new()
        ring = []
        for index in range(48):
            angle = 2 * math.pi * index / 48
            c, s_ = math.cos(angle), math.sin(angle)
            ring.append(mesh.verts.new((math.copysign(abs(c) ** (2 / exponent), c) * size[0] / 2 + centre[0], math.copysign(abs(s_) ** (2 / exponent), s_) * size[1] / 2 + centre[1], z0)))
        face = mesh.faces.new(ring)
        extruded = bmesh.ops.extrude_face_region(mesh, geom=[face])
        bmesh.ops.translate(mesh, vec=(0, 0, z1 - z0), verts=[item for item in extruded['geom'] if isinstance(item, bmesh.types.BMVert)])
        bmesh.ops.recalc_face_normals(mesh, faces=list(mesh.faces))
        data = bpy.data.meshes.new(name)
        mesh.to_mesh(data)
        mesh.free()
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        return finish(obj, finish_material, bevel)

    def cylinder(name, finish_material, centre, radius, z0, z1, bevel=0, vertices=40):
        bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=z1 - z0, location=(centre[0], centre[1], (z0 + z1) / 2))
        obj = bpy.context.object
        obj.name = name
        return finish(obj, finish_material, bevel)

    def box(name, finish_material, centre, size, z0, bevel, rotation=0):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(centre[0], centre[1], z0 + size[2] / 2))
        obj = bpy.context.object
        obj.name = name
        obj.dimensions = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        obj.rotation_euler = (0, 0, math.radians(rotation))
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        return finish(obj, finish_material, bevel)

    # The upper body: a wide white plate, the touchpad and the lights on it.
    rounded_plate('Upper body', white, (0, .012), (.152, .07), .55, .012, .038, .008)
    # The black centre between the grips, under the sticks.
    rounded_plate('Black centre', black, (0, -.006), (.1, .05), .5, .006, .03, .004)
    # The grips: two white ellipsoids running from the upper body toward the player, splayed outward, resting on the table.
    for side in (-1, 1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, radius=1, location=(side * .056, -.014, .0215))
        grip = bpy.context.object
        grip.name = f'Grip {side}'
        grip.scale = (.0205, .046, .0215)
        grip.rotation_euler = (0, 0, math.radians(side * 14))
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        finish(grip, white)
    # The touchpad, and a blue light along each side of it.
    rounded_plate('Touchpad', pad, (0, y_of(170)), (.057, .032), .5, .038, .0405, .002)
    for side in (-1, 1):
        box(f'Light {side}', blue, (side * .0305, y_of(172)), (.0025, .026, .0035), .036, 0)
    # The triggers on the far edge, black, leaning back over the shoulder.
    for side in (-1, 1):
        box(f'Trigger {side}', black, (side * .052, .047), (.03, .01, .016), .028, .004, rotation=side * -10)
    # The sticks: black caps on the black centre, with a ring round each.
    for side in (-1, 1):
        cylinder(f'Stick ring {side}', black, (side * .031, -.004), .0175, .028, .0325, .001)
        cylinder(f'Stick {side}', rubber, (side * .031, -.004), .0108, .0325, .0415, .002)
    # The D-pad on the left: a white cross; the four face buttons on the right in a diamond.
    for name, (px, py) in {'Up': (255, 195), 'Down': (255, 305), 'Left': (200, 250), 'Right': (310, 250)}.items():
        box(f'D-pad {name}', white, (x_of(px), y_of(py)), (.0105, .0105, .0055), .0345, .0015)
    for name, (px, py) in {'Triangle': (938, 165), 'Circle': (1018, 248), 'Cross': (938, 325), 'Square': (858, 248)}.items():
        cylinder(f'Button {name}', grey, (x_of(px), y_of(py)), .005, .0345, .0385, .001, 28)
    # The create and options buttons, the PS button and the microphone on the black.
    for name, px in {'Create': 345, 'Options': 855}.items():
        box(f'{name} button', grey, (x_of(px), y_of(125)), (.003, .0075, .004), .035, .001)
    cylinder('PS button', rubber, (x_of(600), y_of(385)), .0035, .029, .0315, .0005, 24)

    # Stand it on the table, centred, at the declared bounds.
    points = [vertex.co for obj in parts for vertex in obj.data.vertices]
    for obj in parts:
        matrix = obj.matrix_world
        obj.data.transform(matrix)
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
        'recipe': 'dualsense', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
