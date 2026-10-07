"""The owner's surface-mounted electrical board: a white three-row enclosure with a smoked black door, from the owner's picture. Units in metres; 450 mm wide, 120 mm deep, 550 mm tall.

Axes in Blender: X is the width, Y the depth (the front, where the door is, is -Y, which the exporter turns into +Z) and Z the height; it hangs with its bottom at Z = 0, centred.
Inside, behind the smoked door, are three DIN rails of circuit breakers (white modules with a black lever, 18 mm each) with the blanking plates that close the rest of each row.
"""
from __future__ import annotations

import hashlib
from pathlib import Path


def paint(bpy, name, color, roughness, metallic=0, alpha=1):
    item = bpy.data.materials.new(name)
    item.use_nodes = True
    srgb = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in srgb]
    item.diffuse_color = (*linear, alpha)
    shader = item.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    if alpha < 1:
        shader.inputs['Alpha'].default_value = alpha
        item.blend_method = 'BLEND'
    return item


def build(request, _default_material):
    import bpy
    from mathutils import Vector

    white = paint(bpy, 'Enclosure white', '#f1f2f1', .4)
    inside = paint(bpy, 'Inside', '#dcdedd', .5)
    smoke = paint(bpy, 'Smoked door', '#17181a', .12, alpha=.82)
    rail = paint(bpy, 'DIN rail', '#a9adb1', .4, .9)
    module = paint(bpy, 'Breaker', '#eceeed', .45)
    lever = paint(bpy, 'Lever', '#202124', .5)
    blank = paint(bpy, 'Blanking plate', '#cfd2d1', .55)
    parts = []
    w, d, h = .45, .12, .55

    def box(name, finish_material, x, y, z, bevel=.002):
        bpy.ops.mesh.primitive_cube_add(size=1, location=((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2))
        obj = bpy.context.object
        obj.name = name
        obj.dimensions = (x[1] - x[0], y[1] - y[0], z[1] - z[0])
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        size = min(x[1] - x[0], y[1] - y[0], z[1] - z[0])
        if bevel and size > .003:
            soft = obj.modifiers.new('Soft edges', 'BEVEL')
            soft.width = min(bevel, size / 3)
            soft.segments = 2
            bpy.ops.object.modifier_apply(modifier=soft.name)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        obj.data.materials.append(finish_material)
        parts.append(obj)

    half, wall, front = w / 2, .02, -d / 2
    # The enclosure: back, sides, a deeper cap on top (the picture's rounded lid) and bottom, and the frame the door closes on.
    box('Back', inside, (-half, half), (d / 2 - .008, d / 2), (0, h), .002)
    box('Left', white, (-half, -half + wall), (front, d / 2), (0, h), .004)
    box('Right', white, (half - wall, half), (front, d / 2), (0, h), .004)
    box('Top', white, (-half, half), (front, d / 2), (h - .045, h), .01)
    box('Bottom', white, (-half, half), (front, d / 2), (0, .045), .01)
    # Three rows: a DIN rail, twelve modules (nine breakers with their levers, three blanking plates) and the row's channel.
    for row in range(3):
        z = .115 + row * .16
        box(f'Rail {row}', rail, (-half + wall + .01, half - wall - .01), (-.002, .008), (z - .0175, z + .0175), .0005)
        box(f'Channel {row}', inside, (-half + wall, half - wall), (d / 2 - .02, d / 2 - .008), (z - .06, z + .06), .001)
        for index in range(20):
            x0 = -half + wall + .02 + index * .018
            if x0 + .018 > half - wall - .015:
                break
            if index < 13:
                box(f'Breaker {row} {index}', module, (x0 + .0005, x0 + .0175), (-.045, .03), (z - .045, z + .045), .001)
                box(f'Lever {row} {index}', lever, (x0 + .005, x0 + .013), (-.05, -.043), (z - .008, z + .018), .0008)
            else:
                box(f'Blank {row} {index}', blank, (x0 + .0005, x0 + .0175), (-.035, -.03), (z - .045, z + .045), .001)
    # The smoked door, inside the frame's lip, with its small latch.
    box('Door', smoke, (-half + wall - .003, half - wall + .003), (front + .004, front + .014), (.04, h - .04), .004)
    box('Latch', white, (half - wall - .02, half - wall), (front, front + .014), (h / 2 - .02, h / 2 + .01), .002)

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
        'recipe': 'board', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
