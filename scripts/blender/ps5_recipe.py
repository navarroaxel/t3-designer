"""The PlayStation 5, standing on its stand, built from the maker's pictures. Units in metres.

Seen from the front (its narrow side) the console is a tall wedge: two white shells narrower at the top, a black core between them with a thin blue light along each edge, and a black stand.
Seen from the side each shell is a large plate with its top corners rounded, tapering toward the top and bowed outward. The shells are surfaces solidified into plates; the core is a tapered slab.
Axes in Blender: X is the width (the thickness of the console), Y the depth (web +Z, the front, is -Y here) and Z the height; the model stands on the floor, centred.
"""
from __future__ import annotations

import hashlib
import math
from pathlib import Path


def material(bpy, name, color, roughness, metallic=0, emission=None):
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
        shader.inputs['Emission Strength'].default_value = 2.5
    return item


def build_shell(bpy, bmesh, sign, name, finish, width, depth, height, floor, core_half):
    """One white shell: the solid between an outer surface that bows outward and tapers toward the top, and the core's side. Its top corners are rounded."""
    steps_y, steps_z = 40, 30
    mesh = bmesh.new()
    outer, inner = [], []
    for j in range(steps_y + 1):
        v = j / steps_y
        y = floor + v * height
        # The outline: wide at the bottom, the front and the back edges drawing in toward the top, the corners rounded.
        front = -depth / 2 * (1 - .20 * v ** 1.7)
        back = depth / 2 * (1 - .07 * v ** 1.7)
        corner = math.sqrt(max(0, 1 - ((max(v, .86) - .86) / .14) ** 2))
        centre = (front + back) / 2
        half = (back - front) / 2 * max(.30, corner)
        outer_row, inner_row = [], []
        for i in range(steps_z + 1):
            u = i / steps_z
            z = centre + (2 * u - 1) * half
            wide = width / 2 * (1 - .06 * v ** 1.5)
            bow = .010 * (1 - (2 * u - 1) ** 2) * (1 - .55 * v)
            outer_row.append(mesh.verts.new((sign * (wide + bow), z, y)))
            # The inner face lies against the core, and rounds off toward the edges so the plate has no knife edge.
            inner_row.append(mesh.verts.new((sign * core_half * (1 - .12 * v), z, y)))
        outer.append(outer_row)
        inner.append(inner_row)
    for j in range(steps_y):
        for i in range(steps_z):
            mesh.faces.new((outer[j][i], outer[j][i + 1], outer[j + 1][i + 1], outer[j + 1][i]) if sign > 0 else (outer[j][i], outer[j + 1][i], outer[j + 1][i + 1], outer[j][i + 1]))
            mesh.faces.new((inner[j][i], inner[j + 1][i], inner[j + 1][i + 1], inner[j][i + 1]) if sign > 0 else (inner[j][i], inner[j][i + 1], inner[j + 1][i + 1], inner[j + 1][i]))
    # The rim: quads joining the outer and the inner surface along the four sides of the grid.
    for j in range(steps_y):
        mesh.faces.new((outer[j][0], outer[j + 1][0], inner[j + 1][0], inner[j][0]))
        mesh.faces.new((outer[j][steps_z], inner[j][steps_z], inner[j + 1][steps_z], outer[j + 1][steps_z]))
    for i in range(steps_z):
        mesh.faces.new((outer[0][i], inner[0][i], inner[0][i + 1], outer[0][i + 1]))
        mesh.faces.new((outer[steps_y][i], outer[steps_y][i + 1], inner[steps_y][i + 1], inner[steps_y][i]))
    bmesh.ops.recalc_face_normals(mesh, faces=list(mesh.faces))
    data = bpy.data.meshes.new(name)
    mesh.to_mesh(data)
    mesh.free()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    soft = obj.modifiers.new('Soft edges', 'BEVEL')
    soft.width = .003
    soft.segments = 3
    bpy.ops.object.modifier_apply(modifier=soft.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj.data.materials.append(finish)
    return obj


def slab(bpy, name, finish, width_bottom, width_top, depth_bottom, depth_top, z0, z1, bevel):
    """A tapered slab: wider and deeper at the bottom."""
    bottom = [(-width_bottom / 2, -depth_bottom / 2), (width_bottom / 2, -depth_bottom / 2), (width_bottom / 2, depth_bottom / 2), (-width_bottom / 2, depth_bottom / 2)]
    top = [(-width_top / 2, -depth_top / 2), (width_top / 2, -depth_top / 2), (width_top / 2, depth_top / 2), (-width_top / 2, depth_top / 2)]
    vertices = [(x, y, z0) for x, y in bottom] + [(x, y, z1) for x, y in top]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
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
    obj.data.materials.append(finish)
    return obj


def build(request, _default_material):
    import bpy
    import bmesh
    from mathutils import Vector

    width, height, depth = request['dimensions']
    white = material(bpy, 'Shell white', '#f4f5f8', .32)
    black = material(bpy, 'Core black', '#121316', .5)
    stand_black = material(bpy, 'Stand black', '#18191c', .45)
    blue = material(bpy, 'Light blue', '#2f6bff', .3, emission=(.05, .2, 1))
    grey = material(bpy, 'Port grey', '#2b2d31', .6)
    parts = []

    # The stand: a black rounded wedge, wider than the console.
    stand_height = .016
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=.5, depth=1)
    stand = bpy.context.object
    stand.name = 'Stand'
    stand.dimensions = (width, depth * .84, stand_height)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    soft = stand.modifiers.new('Soft edges', 'BEVEL')
    soft.width = .005
    soft.segments = 3
    bpy.ops.object.modifier_apply(modifier=soft.name)
    stand.location = (0, 0, stand_height / 2)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    for polygon in stand.data.polygons:
        polygon.use_smooth = True
    stand.data.materials.append(stand_black)
    parts.append(stand)

    # The console: the shells and the core stand on the stand; the console's own width is the shells' bottom width.
    console = .104
    floor = stand_height - .002
    shell_height = height - floor
    core_half = console * .30
    parts.append(build_shell(bpy, bmesh, -1, 'Shell left', white, console, depth, shell_height, floor, core_half))
    parts.append(build_shell(bpy, bmesh, 1, 'Shell right', white, console, depth, shell_height, floor, core_half))
    core = slab(bpy, 'Core', black, core_half * 2 + .004, core_half * 2 * .88 + .004, depth * .90, depth * .82, floor, height - .012, .004)
    parts.append(core)
    # The light: a thin blue line along each side of the core, at both ends of its depth.
    for index, (x_sign, y_sign) in enumerate([(-1, -1), (1, -1), (-1, 1), (1, 1)]):
        bar = slab(bpy, f'Light {index + 1}', blue, .0035, .0035, .004, .004, floor + .012, height - .026, 0)
        bar.location = (x_sign * (core_half + .001), y_sign * depth * .452, 0)
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
        parts.append(bar)
    # The ports on the front end (-Y here, which the exporter turns into the model's +Z, the side that faces the room): a USB-A and a USB-C, and, on the right shell, the disc slot when it has a drive.
    front = -depth * .5
    for name, z, size in [('USB-A', .19, (.012, .004, .006)), ('USB-C', .162, (.007, .004, .0035))]:
        port = slab(bpy, name, grey, size[0], size[0], size[1], size[1], z - size[2] / 2, z + size[2] / 2, 0)
        port.location = (0, front * .995, 0)
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
        parts.append(port)
    if request['parameters'].get('variant') == 'disc':
        slot = slab(bpy, 'Disc slot', black, .0035, .0035, .004, .004, .075, .145, 0)
        slot.location = (console * .32, front * .93, 0)
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
        parts.append(slot)

    # Normalise the whole to the declared bounds and stand it on the floor, centred.
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
        'recipe': 'ps5', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
