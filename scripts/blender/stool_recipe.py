"""The kitchen's bar stool, from the owner's picture: a modern stool with a cream upholstered shell, the seat and a tall curved back in one soft piece, on four slim tapered legs in a light wood finish that splay
out toward the floor, with a black square footrest ring between them. Units in metres; 0.46 m wide, 0.45 m deep and 1.00 m tall, the seat at 0.75 m. The picture has no sizes: the seat height is the one the first stool
had, and the rest is estimated from the picture.

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
    cream = paint(bpy, 'Cream upholstery', '#e2d1ae', .92)
    wood = paint(bpy, 'Light wood finish', '#d8ae78', .48)
    black = paint(bpy, 'Black steel', '#1a1a1c', .4, .6)
    parts = []
    half = w / 2
    seat_top, seat_thick = .75, .07

    def smooth(obj):
        for polygon in obj.data.polygons:
            polygon.use_smooth = True

    def box(name, finish, x, y, z, bevel=.003, segments=3):
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
            soft.width = min(bevel, size / 2.2)
            soft.segments = segments
            bpy.ops.object.modifier_apply(modifier=soft.name)
        smooth(obj)
        obj.data.materials.append(finish)
        parts.append(obj)
        return obj

    # The seat: a soft, rounded slab. Its back half is the very ellipse the back's shell stands on, so that no corner of it sticks out of the shell; its front half is a rounder, wider curve, reaching 21.5 cm forward.
    centre_y = .02
    rx0, ry0 = half, .215
    foot = .93
    rx_b, ry_b, ry_front = rx0 * foot, ry0 * foot, centre_y + .215
    outline = bmesh.new()
    count = 96
    ring_top = []
    for i in range(count):
        t = 2 * math.pi * i / count
        c, sn = math.cos(t), math.sin(t)
        if sn >= 0:
            x, y = rx_b * c, centre_y + ry_b * sn
        else:
            n = 2.6
            x = rx_b * math.copysign(abs(c) ** (2 / n), c)
            y = centre_y + ry_front * math.copysign(abs(sn) ** (2 / n), sn)
        ring_top.append(outline.verts.new((x, y, seat_top)))
    face = outline.faces.new(ring_top)
    extruded = bmesh.ops.extrude_face_region(outline, geom=[face])
    bmesh.ops.translate(outline, vec=(0, 0, -seat_thick), verts=[v for v in extruded['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(outline, faces=outline.faces[:])
    seat_data = bpy.data.meshes.new('Seat')
    outline.to_mesh(seat_data)
    outline.free()
    seat = bpy.data.objects.new('Seat', seat_data)
    bpy.context.collection.objects.link(seat)
    bpy.context.view_layer.objects.active = seat
    bpy.ops.object.select_all(action='DESELECT')
    seat.select_set(True)
    soft_seat = seat.modifiers.new('Soft edges', 'BEVEL')
    soft_seat.width = .022
    soft_seat.segments = 5
    soft_seat.limit_method = 'ANGLE'
    bpy.ops.object.modifier_apply(modifier=soft_seat.name)
    smooth(seat)
    seat.data.materials.append(cream)
    parts.append(seat)

    # The back: a shell that wraps the seat's back half, in the picture's shape: it narrows a little toward the top, leans back, and its top edge falls toward the sides, so that it blends into the seat's edges.
    # Built as a loft over the angle round the back (from -85 to 85 degrees about +Y) and the height, with an inner and an outer face, a rim and two ends, then smoothed (subdivision) so that the edges are soft.
    shell_bottom, shell_top = seat_top - .035, h
    around = math.radians(85)
    thick0, thick1, lean, drop = .045, .03, .03, .15
    steps_a, steps_z = 31, 11
    shell = bmesh.new()
    outer_grid, inner_grid = [], []
    for i in range(steps_a):
        u = -1 + 2 * i / (steps_a - 1)
        angle = u * around
        top = shell_top - drop * u * u
        column_out, column_in = [], []
        for j in range(steps_z):
            f = j / (steps_z - 1)
            z = shell_bottom + (top - shell_bottom) * f
            # An egg: it stands on the seat's own back ellipse at the foot, widest high up, and a little narrower at the very top.
            narrow = 1 - (1 - foot) * (1 - f) ** 2 - .05 * f ** 3
            rx, ry = rx0 * narrow, ry0 * narrow
            thick = thick0 + (thick1 - thick0) * f
            cy = centre_y + lean * f * f
            column_out.append(shell.verts.new((rx * math.sin(angle), cy + ry * math.cos(angle), z)))
            column_in.append(shell.verts.new(((rx - thick) * math.sin(angle), cy + (ry - thick) * math.cos(angle), z)))
        outer_grid.append(column_out)
        inner_grid.append(column_in)
    for i in range(steps_a - 1):
        for j in range(steps_z - 1):
            shell.faces.new((outer_grid[i][j], outer_grid[i + 1][j], outer_grid[i + 1][j + 1], outer_grid[i][j + 1]))
            shell.faces.new((inner_grid[i][j], inner_grid[i][j + 1], inner_grid[i + 1][j + 1], inner_grid[i + 1][j]))
        shell.faces.new((outer_grid[i][-1], outer_grid[i + 1][-1], inner_grid[i + 1][-1], inner_grid[i][-1]))
        shell.faces.new((outer_grid[i][0], inner_grid[i][0], inner_grid[i + 1][0], outer_grid[i + 1][0]))
    for i in (0, steps_a - 1):
        for j in range(steps_z - 1):
            shell.faces.new((outer_grid[i][j], outer_grid[i][j + 1], inner_grid[i][j + 1], inner_grid[i][j]) if i == 0 else (outer_grid[i][j], inner_grid[i][j], inner_grid[i][j + 1], outer_grid[i][j + 1]))
    bmesh.ops.recalc_face_normals(shell, faces=shell.faces[:])
    shell_data = bpy.data.meshes.new('Back shell')
    shell.to_mesh(shell_data)
    shell.free()
    outer = bpy.data.objects.new('Back shell', shell_data)
    bpy.context.collection.objects.link(outer)
    bpy.context.view_layer.objects.active = outer
    bpy.ops.object.select_all(action='DESELECT')
    outer.select_set(True)
    soft = outer.modifiers.new('Soft', 'SUBSURF')
    soft.levels = 2
    soft.render_levels = 2
    bpy.ops.object.modifier_apply(modifier=soft.name)
    smooth(outer)
    outer.data.materials.append(cream)
    parts.append(outer)

    # The legs: four slim cones from under the seat to the floor, splaying out 4 cm.
    legs = bmesh.new()
    sides = 14
    def ring(centre, radius, z):
        return [legs.verts.new((centre[0] + math.cos(2 * math.pi * i / sides) * radius, centre[1] + math.sin(2 * math.pi * i / sides) * radius, z)) for i in range(sides)]
    top_z = seat_top - seat_thick
    for sx in (-1, 1):
        for sy in (-1, 1):
            upper = ring((sx * .165, sy * .14), .0165, top_z)
            lower = ring((sx * .205, sy * .18), .0085, 0)
            for i in range(sides):
                legs.faces.new((lower[i], lower[(i + 1) % sides], upper[(i + 1) % sides], upper[i]))
            legs.faces.new(lower[::-1])
            legs.faces.new(upper)
    bmesh.ops.recalc_face_normals(legs, faces=legs.faces[:])
    data = bpy.data.meshes.new('Legs')
    legs.to_mesh(data)
    legs.free()
    leg_obj = bpy.data.objects.new('Legs', data)
    bpy.context.collection.objects.link(leg_obj)
    data.materials.append(wood)
    smooth(leg_obj)
    parts.append(leg_obj)

    # The footrest ring: four square rods between the legs, low down, in black.
    rod, rod_z = .012, .28
    t = (top_z - rod_z) / top_z
    gx, gy = .165 + .04 * t, .14 + .04 * t
    for sy in (-1, 1):
        box('Rail front/back', black, (-gx, gx), (sy * gy - rod / 2, sy * gy + rod / 2), (rod_z - rod / 2, rod_z + rod / 2), .004)
    for sx in (-1, 1):
        box('Rail side', black, (sx * gx - rod / 2, sx * gx + rod / 2), (-gy, gy), (rod_z - rod / 2, rod_z + rod / 2), .004)

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
        'recipe': 'stool', 'version': 3, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
