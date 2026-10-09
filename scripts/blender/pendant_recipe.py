"""The island's pendant lamp: a dome shade in matte black hung on a thin black cord from a round ceiling rose, with a bulb inside that lights the room through the open bottom and the inside of the shade.
Units in metres; 0.30 m across the shade, 0.95 m from the rim of the shade to the ceiling (the cord is as long as the lamp is hung low). The `lit` parameter chooses the light: a warm bulb with a
glowing shade inside (true) or a dull bulb and a dull inside (false).

Axes in Blender: X and Y are the width (the shade is round), Z the height; the rim of the shade is at Z = 0, centred, and the ceiling rose is at the top.
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
        shader.inputs['Emission Strength'].default_value = 5
    return item


def build(request, _default_material):
    import bpy
    import bmesh
    from mathutils import Vector

    width, height, _depth = request['dimensions']
    lit = bool(request['parameters'].get('lit', True))
    black = paint(bpy, 'Matt black', '#141517', .6, .3)
    inside = paint(bpy, 'Shade inside', '#ffe2b0', .5, 0, emission=(1, .78, .42)) if lit else paint(bpy, 'Shade inside off', '#b9b3a6', .7)
    bulb = paint(bpy, 'Bulb', '#fff4dc', .3, 0, emission=(1, .9, .6)) if lit else paint(bpy, 'Bulb off', '#d9d4c8', .4)
    parts = []
    radius = width / 2
    shade_height = .22

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
        return obj

    def lathe(profile, finish, name, steps=40):
        mesh = bmesh.new()
        verts = [mesh.verts.new((r, 0, z)) for r, z in profile]
        edges = [mesh.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
        bmesh.ops.spin(mesh, geom=verts + edges, cent=(0, 0, 0), axis=(0, 0, 1), angle=math.tau, steps=steps)
        bmesh.ops.remove_doubles(mesh, verts=mesh.verts[:], dist=1e-5)
        bmesh.ops.recalc_face_normals(mesh, faces=mesh.faces[:])
        return link(name, mesh, finish)

    # The dome's outside, from the rim up to the crown, and its inside, a hair in: the shade is a thin shell.
    dome = [(1, 0), (.995, .12), (.94, .45), (.8, .72), (.55, .9), (.25, .985), (.04, 1.0)]
    outer = [(radius * r, shade_height * z) for r, z in dome]
    lathe(outer, black, 'Shade outside')
    lathe([(max(0, r - .004), z - .0035 if z > 0 else 0) for r, z in reversed(outer)], inside, 'Shade inside')
    # The rim, a thin ring joining the two faces.
    lathe([(radius, 0), (radius - .004, 0)], black, 'Rim', steps=40)
    # The bulb, inside, hanging from the crown, and the socket above it.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=.04, location=(0, 0, shade_height * .45))
    glass = bpy.context.object
    glass.name = 'Bulb'
    glass.data.materials.append(bulb)
    parts.append(glass)
    # The cord and the ceiling rose.
    cord_top = height - .03
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=.0035, depth=cord_top - shade_height, location=(0, 0, shade_height + (cord_top - shade_height) / 2))
    cord = bpy.context.object
    cord.name = 'Cord'
    cord.data.materials.append(black)
    parts.append(cord)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=.05, depth=.03, location=(0, 0, height - .015))
    rose = bpy.context.object
    rose.name = 'Ceiling rose'
    rose.data.materials.append(black)
    parts.append(rose)

    for obj in parts:
        obj.data.transform(obj.matrix_world)
        obj.matrix_world = obj.matrix_world.__class__.Identity(4)
    points = [vertex.co for obj in parts for vertex in obj.data.vertices]
    lower = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    upper = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    size = upper - lower
    # The model's Z is the exporter's Y up: X and Y are the width, so the target is (width, depth, height) with depth = width.
    target = Vector((request['dimensions'][0], request['dimensions'][2], request['dimensions'][1]))
    centre = Vector(((lower.x + upper.x) / 2, (lower.y + upper.y) / 2, lower.z))
    for obj in parts:
        for vertex in obj.data.vertices:
            vertex.co = Vector(tuple((vertex.co[i] - centre[i]) * target[i] / size[i] for i in range(3)))
        obj.data.update()
    return parts, {
        'recipe': 'pendant', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
