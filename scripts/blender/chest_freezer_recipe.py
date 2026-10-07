"""A chest freezer, from the owner's picture (an Inelro): a white cabinet with a lid that overhangs it a little, a raised handle plate with the maker's oval badge at the front of the lid, a round
thermostat dial on a teardrop plate at the lower right of the front, the drain plug at the lower left and four castors. Units in metres; 0.56 m wide, 0.58 m deep and 0.85 m tall with its castors.

Axes in Blender: X is the width, Y the depth (the front is -Y, which the exporter turns into +Z) and Z the height; it stands on its castors at Z = 0, centred.
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

    white = paint(bpy, 'Enamel white', '#f6f7f7', .3)
    lid_white = paint(bpy, 'Lid white', '#f1f2f2', .35)
    grey = paint(bpy, 'Seam', '#c9cccd', .5)
    blue = paint(bpy, 'Badge blue', '#2b3f9a', .3)
    red = paint(bpy, 'Badge red', '#c4262e', .3)
    dial = paint(bpy, 'Dial', '#e9eaea', .4)
    mark = paint(bpy, 'Marks', '#3a6fd0', .4)
    black = paint(bpy, 'Castor', '#17181a', .6)
    steel = paint(bpy, 'Fork', '#8f9397', .4, .8)
    parts = []
    w, d, h = .56, .58, .85
    half, front, back = w / 2, -d / 2, d / 2
    wheel = .06
    body_top = h - .05

    def finish(obj, finish_material, bevel=0):
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

    def box(name, finish_material, x, y, z, bevel=.003):
        bpy.ops.mesh.primitive_cube_add(size=1, location=((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2))
        obj = bpy.context.object
        obj.name = name
        obj.dimensions = (x[1] - x[0], y[1] - y[0], z[1] - z[0])
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        size = min(x[1] - x[0], y[1] - y[0], z[1] - z[0])
        finish(obj, finish_material, min(bevel, size / 3) if size > .004 else 0)

    def disc(name, finish_material, x, z, radius, y0, y1, bevel=0):
        """A round plate facing the front (-Y), from y0 to y1."""
        bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=radius, depth=y1 - y0, location=(x, (y0 + y1) / 2, z))
        obj = bpy.context.object
        obj.name = name
        obj.rotation_euler = (math.pi / 2, 0, 0)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        finish(obj, finish_material, bevel)

    # The cabinet and the lid, which overhangs it by 12 mm on three sides and has a raised plate at the front with the badge.
    box('Cabinet', white, (-half + .012, half - .012), (front + .012, back - .012), (wheel, body_top), .012)
    box('Seam', grey, (-half + .008, half - .008), (front + .008, back - .008), (body_top - .004, body_top + .004), .002)
    box('Lid', lid_white, (-half, half), (front, back), (body_top, h), .014)
    box('Handle plate', lid_white, (-.13, .13), (front - .012, front + .03), (body_top + .015, h - .005), .01)
    disc('Badge blue', blue, 0, h - .03, .03, front - .014, front - .011, .001)
    disc('Badge red', red, 0, h - .03, .022, front - .0145, front - .0115, .001)
    # The thermostat dial on its teardrop plate, and the drain plug.
    box('Dial plate', white, (.1, .24), (front + .006, front + .014), (.14, .28), .004)
    disc('Dial', dial, .17, .21, .042, front - .006, front + .012, .004)
    disc('Dial ring', mark, .17, .21, .047, front + .004, front + .0125, .0005)
    box('Dial pointer', white, (.12, .22), (front - .014, front - .006), (.205, .215), .002)
    disc('Drain plug', white, -.17, wheel + .06, .028, front - .004, front + .012, .004)
    # Four castors, a black wheel in a steel fork.
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * (half - .05), sy * (d / 2 - .06)
            bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.03, depth=.025, location=(x, y, .03))
            obj = bpy.context.object
            obj.name = f'Wheel {sx} {sy}'
            obj.rotation_euler = (0, math.pi / 2, 0)
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
            finish(obj, black, .003)
            box(f'Fork {sx} {sy}', steel, (x - .016, x + .016), (y - .02, y + .02), (.045, wheel), .002)

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
        'recipe': 'chest-freezer', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
