"""The owner's dog, lying down, from the owner's photo: a medium, shaggy black dog with a white chest and beard, white paws, long drooping ears, the head up and the front paws out in front, the
hind legs folded under the body and a bushy tail. Built from ellipsoids (the fur is not modelled, only its volumes). Units in metres; 0.42 m wide, 0.42 m tall (the head) and 0.92 m long.

Axes in Blender: X is the width, Y the length (the head is toward -Y, the front, which the exporter turns into +Z) and Z the height; it lies at Z = 0, centred.
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

    black = paint(bpy, 'Black fur', '#161719', .95)
    dark = paint(bpy, 'Grey fur', '#2a2b2e', .95)
    white = paint(bpy, 'White fur', '#e9e6df', .95)
    glossy = paint(bpy, 'Nose and eyes', '#050506', .25)
    parts = []

    def blob(name, finish, centre, radii, rotation=(0, 0, 0), segments=28):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=segments // 2, radius=1, location=centre, rotation=rotation)
        obj = bpy.context.object
        obj.name = name
        obj.scale = radii
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        obj.data.materials.append(finish)
        parts.append(obj)

    # The body, lying on its side a little, and the hind legs folded under it (the haunches).
    blob('Body', black, (0, .13, .15), (.18, .31, .15))
    blob('Chest', white, (0, -.12, .17), (.12, .13, .14))
    for side in (-1, 1):
        blob(f'Haunch {side}', black, (side * .13, .27, .11), (.09, .16, .11))
        blob(f'Hind paw {side}', white if side > 0 else black, (side * .12, .12, .035), (.05, .075, .035))
    # The neck, the head up, the muzzle with its white beard, the nose and the eyes.
    blob('Neck', black, (0, -.2, .27), (.10, .12, .13), (math.radians(-25), 0, 0))
    blob('Head', black, (0, -.31, .33), (.105, .125, .105))
    blob('Muzzle', dark, (0, -.42, .29), (.065, .1, .055))
    blob('Beard', white, (0, -.40, .23), (.075, .085, .06))
    blob('Nose', glossy, (0, -.515, .295), (.026, .02, .022))
    for side in (-1, 1):
        blob(f'Eye {side}', glossy, (side * .05, -.375, .355), (.014, .01, .014), segments=12)
        # The long ears, hanging to each side of the head.
        blob(f'Ear {side}', black, (side * .12, -.29, .27), (.03, .075, .115), (0, math.radians(side * -8), 0))
        # The front legs, out in front, with the white paws.
        blob(f'Foreleg {side}', black, (side * .075, -.30, .06), (.048, .17, .05))
        blob(f'Fore paw {side}', white, (side * .075, -.43, .042), (.052, .06, .04))
    # The bushy tail, along the floor.
    blob('Tail', black, (.1, .46, .07), (.045, .15, .05), (0, 0, math.radians(-18)))

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
        'recipe': 'dog', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
