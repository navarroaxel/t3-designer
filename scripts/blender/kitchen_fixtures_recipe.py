"""The kitchen's sink basin and tap, from the owner's pictures. Units in metres.

`sink`: an undermount stainless steel basin, 600 by 400 mm and 200 mm deep, open at the top (it sits under the worktop's opening) with a thin lip, a rounded floor and a drain.
`tap`: a brushed brass pull-down tap: a round base, a tall pipe, a half-circle arch, the spray head with its black ring and a side lever.
Axes in Blender: X is the width, Y the depth (the front, toward the room, is -Y, which the exporter turns into +Z) and Z the height; the model stands at Z = 0, centred in X and Y.
The tap's anchor (the pipe, which stands on the worktop) is reported in the manifest as `anchor`, relative to the model's centre.
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

    part = request['parameters']['part']
    parts = []
    anchor = [0.0, 0.0]

    def select(obj):
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj

    def finish(obj, finish_material, bevel=0, smooth=True):
        select(obj)
        if bevel:
            soft = obj.modifiers.new('Soft edges', 'BEVEL')
            soft.width = bevel
            soft.segments = 2
            bpy.ops.object.modifier_apply(modifier=soft.name)
        if smooth:
            for polygon in obj.data.polygons:
                polygon.use_smooth = True
        obj.data.materials.append(finish_material)
        parts.append(obj)

    def box(name, finish_material, x, y, z, bevel=.002):
        bpy.ops.mesh.primitive_cube_add(size=1, location=((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2))
        obj = bpy.context.object
        obj.name = name
        obj.dimensions = (x[1] - x[0], y[1] - y[0], z[1] - z[0])
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        finish(obj, finish_material, min(bevel, min(x[1] - x[0], y[1] - y[0], z[1] - z[0]) / 3))

    def cylinder(name, finish_material, centre, radius, z0, z1, bevel=0):
        bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=radius, depth=z1 - z0, location=(centre[0], centre[1], (z0 + z1) / 2))
        obj = bpy.context.object
        obj.name = name
        finish(obj, finish_material, bevel)

    if part == 'sink':
        steel = paint(bpy, 'Brushed steel', '#b9bec4', .38, .9)
        dark = paint(bpy, 'Drain', '#2a2c2f', .5, .6)
        w, d, h, t = .6, .4, .2, .003
        # Walls and floor (the floor a little above the bottom of the walls so the basin reads as pressed).
        box('Floor', steel, (-w / 2, w / 2), (-d / 2, d / 2), (0, t), .002)
        box('Back wall', steel, (-w / 2, w / 2), (d / 2 - t, d / 2), (0, h), .002)
        box('Front wall', steel, (-w / 2, w / 2), (-d / 2, -d / 2 + t), (0, h), .002)
        box('Left wall', steel, (-w / 2, -w / 2 + t), (-d / 2, d / 2), (0, h), .002)
        box('Right wall', steel, (w / 2 - t, w / 2), (-d / 2, d / 2), (0, h), .002)
        box('Lip', steel, (-w / 2 - .01, w / 2 + .01), (-d / 2 - .01, d / 2 + .01), (h - .002, h + .002), .001)
        cylinder('Drain', dark, (0, 0), .045, t, t + .003)
    else:
        brass = paint(bpy, 'Brushed brass', '#b08d57', .32, .95)
        black = paint(bpy, 'Black ring', '#17181a', .45)
        radius, pipe, base_h, rise, arch = .0045 * 2.4, .011, .08, .38, .075
        cylinder('Base', brass, (0, 0), .02, 0, base_h, .002)
        cylinder('Pipe', brass, (0, 0), pipe, base_h, rise, 0)
        # The arch: a half circle over the sink, turning from the pipe toward the room (-Y), made as a swept curve.
        curve = bpy.data.curves.new('Arch', 'CURVE')
        curve.dimensions = '3D'
        curve.bevel_depth = pipe
        curve.bevel_resolution = 6
        spline = curve.splines.new('POLY')
        steps = 24
        spline.points.add(steps)
        for index in range(steps + 1):
            angle = math.pi * index / steps
            spline.points[index].co = (0, -arch + arch * math.cos(angle), rise + arch * math.sin(angle), 1)
        arch_obj = bpy.data.objects.new('Arch', curve)
        bpy.context.collection.objects.link(arch_obj)
        select(arch_obj)
        bpy.ops.object.convert(target='MESH')
        arch_obj = bpy.context.object
        finish(arch_obj, brass, 0)
        # The spray head hangs from the arch's end, with its black ring near the top, and a side lever on the base.
        end = -2 * arch
        cylinder('Head', brass, (0, end), .0125, rise - .19, rise, .0015)
        cylinder('Head ring', black, (0, end), .0132, rise - .075, rise - .062, 0)
        cylinder('Head tip', black, (0, end), .0105, rise - .195, rise - .185, 0)
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.0045, depth=.06, location=(.04, 0, base_h - .02))
        lever = bpy.context.object
        lever.name = 'Lever'
        lever.rotation_euler = (0, math.pi / 2, 0)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        finish(lever, brass, 0)
        cylinder('Lever knob', brass, (.075, 0), .008, base_h - .045, base_h + .08, .001)

    for obj in parts:
        obj.data.transform(obj.matrix_world)
        obj.matrix_world = obj.matrix_world.__class__.Identity(4)
    points = [vertex.co for obj in parts for vertex in obj.data.vertices]
    lower = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    upper = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    size = upper - lower
    target = Vector((request['dimensions'][0], request['dimensions'][2], request['dimensions'][1]))
    centre = Vector(((lower.x + upper.x) / 2, (lower.y + upper.y) / 2, lower.z))
    scale = Vector(tuple(target[i] / size[i] for i in range(3)))
    for obj in parts:
        for vertex in obj.data.vertices:
            vertex.co = Vector(tuple((vertex.co[i] - centre[i]) * scale[i] for i in range(3)))
        obj.data.update()
    anchor = [(0 - centre.x) * scale.x, (0 - centre.y) * scale.y]
    return parts, {
        'recipe': 'kitchen-fixture', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review', 'part': part,
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'anchor': anchor, 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
