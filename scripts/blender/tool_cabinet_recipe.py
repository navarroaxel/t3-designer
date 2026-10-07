"""The garage's tool cabinet set, from the owner's pictures: two tall two-door cabinets at the ends and, between them, a workbench unit: four drawers and, beside them, a drawer over a two-door
cupboard, a wood worktop, a pegboard over it and two wall cabinets above. Matt black steel with orange handles and logo plates. Units in metres; 2.70 m wide, 0.472 m deep and 1.92 m tall.

Axes in Blender: X is the width, Y the depth (the doors' side, the front, is -Y, which the exporter turns into +Z; the back is against the wall) and Z the height; it stands on its feet at Z = 0, centred.
The pieces' proportions are read from the pictures (the tall cabinets 0.75 m wide each, the middle 1.2 m, the worktop at 0.9 m, the wall cabinets from 1.52 m to 1.88 m, the pegboard between).
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
    import bmesh
    import math
    from mathutils import Vector

    black = paint(bpy, 'Matt black', '#1c1d20', .65, .25)
    panel = paint(bpy, 'Door black', '#222326', .6, .2)
    orange = paint(bpy, 'Orange', '#ee7a1c', .45)
    wood = paint(bpy, 'Worktop', '#c9a56a', .55)
    peg = paint(bpy, 'Pegboard', '#17181a', .7)
    hole = paint(bpy, 'Peg hole', '#9a9ca0', .6)
    foot = paint(bpy, 'Foot', '#0d0d0f', .6)
    parts = []
    w, d, h = 2.7, .472, 1.92
    half, front, back = w / 2, -d / 2, d / 2
    feet = .05

    def box(name, finish_material, x, y, z, bevel=.003):
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
            soft.segments = 2
            bpy.ops.object.modifier_apply(modifier=soft.name)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        obj.data.materials.append(finish_material)
        parts.append(obj)

    def tall(name, x0, x1):
        box(f'{name} body', black, (x0, x1), (front + .02, back), (feet, h), .006)
        mid = (x0 + x1) / 2
        for side, (a, b) in enumerate(((x0 + .012, mid - .002), (mid + .002, x1 - .012))):
            box(f'{name} door {side}', panel, (a, b), (front, front + .02), (feet + .02, h - .03), .004)
        for dx in (-.03, .03):
            box(f'{name} handle {dx}', orange, (mid + dx - .006, mid + dx + .006), (front - .018, front), (.93, 1.36), .003)
        box(f'{name} logo', orange, (mid - .17, mid - .03), (front - .003, front), (1.7, 1.78), .002)
        box(f'{name} lock', foot, (mid + .06, mid + .068), (front - .003, front), (.97, .977), .001)
        for fx in (x0 + .05, x1 - .05):
            for fy in (front + .06, back - .06):
                box(f'{name} foot', foot, (fx - .02, fx + .02), (fy - .02, fy + .02), (0, feet), .002)

    tall('Left', -half, -half + .75)
    tall('Right', half - .75, half)
    # The middle: the workbench base, in two columns (four drawers; a drawer over a cupboard) under a wood worktop, 0.9 m up.
    mx0, mx1 = -.6, .6
    box('Base body', black, (mx0, mx1), (front + .02, back), (feet, .88), .004)
    box('Worktop', wood, (mx0 - .005, mx1), (front - .01, back), (.88, .92), .004)
    for index in range(4):
        z0 = feet + .02 + index * .2
        box(f'Drawer {index}', panel, (mx0 + .012, -.012), (front, front + .02), (z0, z0 + .19), .004)
        box(f'Drawer handle {index}', orange, (-.34, -.2), (front - .016, front), (z0 + .13, z0 + .15), .003)
    box('Drawer wide', panel, (.012, mx1 - .012), (front, front + .02), (.69, .87), .004)
    box('Drawer wide handle', orange, (.2, .4), (front - .016, front), (.8, .82), .003)
    for side, (a, b) in enumerate(((.012, .298), (.302, mx1 - .012))):
        box(f'Cupboard door {side}', panel, (a, b), (front, front + .02), (feet + .02, .68), .004)
    for dx in (-.025, .025):
        box(f'Cupboard handle {dx}', orange, (.3 + dx - .006, .3 + dx + .006), (front - .018, front), (.27, .48), .003)
    # The pegboard over the worktop, with its grid of holes (one mesh), and the two orange plates; the wall cabinets over it.
    box('Pegboard', peg, (mx0, mx1), (back - .02, back), (.92, 1.52), .002)
    mesh = bmesh.new()
    for column in range(41):
        for row in range(19):
            cx = mx0 + .03 + column * .0275
            cz = .95 + row * .0295
            if cx > mx1 - .02 or cz > 1.5:
                continue
            ring = [mesh.verts.new((cx + .005 * math.cos(a * math.pi / 4), back - .0205, cz + .005 * math.sin(a * math.pi / 4))) for a in range(8)]
            mesh.faces.new(ring[::-1])
    data = bpy.data.meshes.new('Peg holes')
    mesh.to_mesh(data)
    mesh.free()
    holes = bpy.data.objects.new('Peg holes', data)
    bpy.context.collection.objects.link(holes)
    bpy.ops.object.select_all(action='DESELECT')
    holes.select_set(True)
    bpy.context.view_layer.objects.active = holes
    holes.data.materials.append(hole)
    parts.append(holes)
    for x in (-.28, .12):
        box('Pegboard plate', orange, (x - .06, x + .06), (back - .028, back - .02), (1.22, 1.32), .002)
    box('Side left', black, (mx0, mx0 + .012), (front + .14, back), (.92, 1.52), .002)
    box('Side right', black, (mx1 - .012, mx1), (front + .14, back), (.92, 1.52), .002)
    for side, (a, b) in enumerate(((mx0, -.003), (.003, mx1))):
        box(f'Wall cabinet {side}', black, (a, b), (back - .33, back), (1.52, 1.88), .005)
        mid = (a + b) / 2
        for leaf, (c, e) in enumerate(((a + .012, mid - .002), (mid + .002, b - .012))):
            box(f'Wall door {side} {leaf}', panel, (c, e), (back - .35, back - .33), (1.54, 1.86), .004)
        for dx in (-.03, .03):
            box(f'Wall handle {side} {dx}', orange, (mid + dx - .006, mid + dx + .006), (back - .368, back - .35), (1.62, 1.78), .003)

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
        'recipe': 'tool-cabinet', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
