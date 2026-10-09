"""The kitchen's wall chimney hood, from the owner's pictures: a stainless steel canopy, a vertical lip around its bottom edge, the four sloping faces drawing in to a square duct that rises to the ceiling,
and a recessed underside with the filter and the five knobs on the front lip. Units in metres; the canopy is 0.54 m wide and 0.50 m deep, the model is as tall as the canopy and its duct together.

Axes in Blender: X is the width, Y the depth (the front, the side that faces the room, is -Y, which the exporter turns into +Z; the back is against the wall) and Z the height; the canopy's lower edge is at Z = 0, centred.
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

    width, height, depth = request['dimensions']
    inox = paint(bpy, 'Brushed steel', '#c3c7cb', .38, .75)
    inside = paint(bpy, 'Underside', '#82868b', .45, .7)
    filter_grey = paint(bpy, 'Filter', '#55595e', .6, .6)
    black = paint(bpy, 'Knob black', '#1b1c1f', .5, .2)
    steel_knob = paint(bpy, 'Knob steel', '#d4d7da', .3, .9)
    parts = []

    def link(name, mesh, finish):
        data = bpy.data.meshes.new(name)
        mesh.to_mesh(data)
        mesh.free()
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        data.materials.append(finish)
        parts.append(obj)
        return obj

    def rect(mesh, x0, x1, y0, y1, z):
        return [mesh.verts.new(point) for point in ((x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z))]

    def loft(mesh, lower, upper):
        for index in range(4):
            mesh.faces.new((lower[index], lower[(index + 1) % 4], upper[(index + 1) % 4], upper[index]))

    half, front, back = width / 2, -depth / 2, depth / 2
    lip, slope = .055, .19
    duct_w, duct_d = .30, .26
    top = height
    # The canopy and its duct: the lip (straight), the pyramid (sloping, drawing in toward the back so the duct stands against the wall) and the duct to the top.
    outer = bmesh.new()
    ring0 = rect(outer, -half, half, front, back, 0)
    ring1 = rect(outer, -half, half, front, back, lip)
    ring2 = rect(outer, -duct_w / 2, duct_w / 2, back - duct_d, back, lip + slope)
    ring3 = rect(outer, -duct_w / 2, duct_w / 2, back - duct_d, back, top)
    loft(outer, ring0, ring1)
    loft(outer, ring1, ring2)
    loft(outer, ring2, ring3)
    outer.faces.new(ring3[::-1])
    bmesh.ops.recalc_face_normals(outer, faces=outer.faces[:])
    link('Canopy and duct', outer, inox)
    # The underside: a flat rim, the recessed walls and the plate of the filter, in a darker steel.
    under = bmesh.new()
    wall = .016
    rim = rect(under, -half, half, front, back, 0)
    inner = rect(under, -half + wall, half - wall, front + wall, back - wall, 0)
    for index in range(4):
        under.faces.new((rim[index], inner[index], inner[(index + 1) % 4], rim[(index + 1) % 4]))
    deep = rect(under, -half + wall, half - wall, front + wall, back - wall, .035)
    for index in range(4):
        under.faces.new((inner[index], deep[index], deep[(index + 1) % 4], inner[(index + 1) % 4]))
    under.faces.new(deep[::-1])
    bmesh.ops.recalc_face_normals(under, faces=under.faces[:])
    link('Underside', under, inside)
    # The filter: a grille of slots on the plate.
    slots = bmesh.new()
    for row in range(4):
        y0 = front + wall + .035 + row * .105
        rect_y = (y0, y0 + .07)
        for column in range(2):
            x0 = -half + wall + .03 + column * (width - 2 * wall - .06) / 2
            quad = rect(slots, x0, x0 + (width - 2 * wall - .06) / 2 - .012, rect_y[0], rect_y[1], .0345)
            slots.faces.new(quad[::-1])
    bmesh.ops.recalc_face_normals(slots, faces=slots.faces[:])
    link('Filter', slots, filter_grey)
    # The five knobs, on the front of the lip.
    for index in range(5):
        x = (index - 2) * .045
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.0085, depth=.012, location=(x, front - .004, lip / 2), rotation=(math.pi / 2, 0, 0))
        knob = bpy.context.object
        knob.name = f'Knob {index + 1}'
        for polygon in knob.data.polygons:
            polygon.use_smooth = True
        knob.data.materials.append(steel_knob if index == 2 else black)
        parts.append(knob)

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
        'recipe': 'hood', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
