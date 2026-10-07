"""The owner's Samsung RT29K577JS8, closed: a top-freezer with a water dispenser, from the maker's pictures. Units in metres; 675 mm wide, 668 mm deep (handle included), 1.825 m tall with its feet.

Axes in Blender: X is the width, Y the depth (the front, where the doors are, is -Y, which the exporter turns into +Z) and Z the height; it stands on its feet at Z = 0, centred.
The doors are brushed stainless steel and the sides are grey; the freezer's door is `freezerHeight` tall (parameters, from the 101 L gross capacity).
"""
from __future__ import annotations

import hashlib
import math
from pathlib import Path


def paint(bpy, name, color, roughness, metallic=0, emission=None, alpha=1):
    item = bpy.data.materials.new(name)
    item.use_nodes = True
    srgb = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in srgb]
    item.diffuse_color = (*linear, 1)
    shader = item.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    if alpha < 1:
        shader.inputs['Alpha'].default_value = alpha
        item.blend_method = 'BLEND'
    if emission:
        shader.inputs['Emission Color'].default_value = (*emission, 1)
        shader.inputs['Emission Strength'].default_value = 2
    return item


def build(request, _default_material):
    import bpy
    from mathutils import Vector

    steel = paint(bpy, 'Stainless steel', '#c9cdd1', .42, .85)
    side = paint(bpy, 'Side grey', '#8e9297', .5, .4)
    black = paint(bpy, 'Black', '#16171a', .35)
    glass = paint(bpy, 'Dispenser tray', '#9aa3ab', .2, .3)
    foot = paint(bpy, 'Foot', '#1a1b1d', .6)
    blue = paint(bpy, 'Display blue', '#2c8cff', .3, emission=(.1, .5, 1))
    parts = []
    width, depth, height = .675, .668, 1.825
    front = -depth / 2
    door = .03
    split = float(request['parameters']['freezerHeight'])
    split_z = height - split

    def select(obj):
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj

    def finish(obj, finish_material, bevel):
        select(obj)
        if bevel:
            soft = obj.modifiers.new('Soft edges', 'BEVEL')
            soft.width = bevel
            soft.segments = 2
            bpy.ops.object.modifier_apply(modifier=soft.name)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        obj.data.materials.append(finish_material)
        parts.append(obj)

    def box(name, finish_material, x, y, z, bevel=.003):
        """A box from its X, Y and Z ranges."""
        bpy.ops.mesh.primitive_cube_add(size=1, location=((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2))
        obj = bpy.context.object
        obj.name = name
        obj.dimensions = (x[1] - x[0], y[1] - y[0], z[1] - z[0])
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        finish(obj, finish_material, min(bevel, (min(x[1] - x[0], y[1] - y[0], z[1] - z[0])) / 3))

    half = width / 2
    part = request['parameters'].get('part', 'closed')
    white = paint(bpy, 'Liner white', '#f1f3f5', .4)
    clear = paint(bpy, 'Clear plastic', '#f2f7fa', .12, alpha=.28)
    light = paint(bpy, 'Light bar', '#5aa7ff', .3, emission=(.2, .5, 1))
    fan = paint(bpy, 'Fan', '#3d8bff', .3, emission=(.1, .35, 1))
    grey = paint(bpy, 'Drawer grey', '#6f7377', .5)

    def bin_(name, x0, x1, y0, z0, tall=.08, deep=.09):
        """A clear door bin on the inside of a door (y grows into the room behind it)."""
        box(f'{name} bin', clear, (x0, x1), (y0, y0 + deep), (z0, z0 + tall), .002)
        box(f'{name} base', white, (x0, x1), (y0, y0 + deep), (z0, z0 + .004), .001)
        box(f'{name} lip', white, (x0, x1), (y0 + deep - .006, y0 + deep), (z0, z0 + tall), .002)
        for x in (x0, x1 - .006):
            box(f'{name} side', white, (x, x + .006), (y0, y0 + deep), (z0, z0 + tall), .002)

    if part == 'closed':
        box('Body', side, (-half, half), (front + door, depth / 2), (.04, height), .004)
        box('Lower door', steel, (-half + .004, half - .004), (front, front + door), (.05, split_z - .0035), .004)
        box('Freezer door', steel, (-half + .004, half - .004), (front, front + door), (split_z + .0035, height), .004)
        # The handle: a black slot along the top of the lower door, with a steel lip above it.
        box('Handle slot', black, (-half + .06, half - .06), (front - .004, front + .02), (split_z - .09, split_z - .015), .003)
        box('Handle lip', steel, (-half + .06, half - .06), (front - .006, front), (split_z - .015, split_z - .004), .002)
        # The dispenser: a black recess with its header, a lighter tray inside.
        box('Dispenser', black, (-.085, .085), (front - .004, front + .02), (.61, .89), .004)
        box('Dispenser tray', glass, (-.05, .05), (front - .006, front + .01), (.64, .78), .004)
        box('Dispenser header', black, (-.085, .085), (front - .006, front + .02), (.845, .89), .002)
        # The display on the freezer door and a Samsung bar at its top corner.
        box('Display', black, (-.028, .028), (front - .002, front), (height - .2, height - .12), .002)
        box('Display light', blue, (-.018, .018), (front - .0035, front - .002), (height - .175, height - .15), .001)
        box('Brand', black, (.19, .27), (front - .001, front), (height - .045, height - .037), .0005)
        for sx in (-1, 1):
            for sy in (-1, 1):
                bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.02, depth=.04, location=(sx * (half - .04), sy * (depth / 2 - .06), .02))
                obj = bpy.context.object
                obj.name = f'Foot {sx} {sy}'
                finish(obj, foot, 0)

    elif part == 'cabinet':
        # The cabinet seen from the front, doors off, as in the maker's open-door picture: a white liner with grey skin outside, the divider with its front lip, the freezer with its blue-ringed fan, vents and
        # light bar over the movable ice maker, the fridge with its icon panel, filter, second fan, three glass shelves with white rails, and the big vegetable drawer.
        t = .035
        cab = (front + door, depth / 2)
        y_front, y_back = cab[0], depth / 2 - t
        box('Skin left', side, (-half, -half + .004), cab, (.04, height), .001)
        box('Skin right', side, (half - .004, half), cab, (.04, height), .001)
        box('Liner left', white, (-half + .004, -half + t), cab, (.04, height), .002)
        box('Liner right', white, (half - t, half - .004), cab, (.04, height), .002)
        box('Back', white, (-half, half), (depth / 2 - t, depth / 2), (.04, height), .002)
        box('Top', white, (-half, half), cab, (height - t, height), .002)
        box('Bottom', grey, (-half, half), cab, (.04, .04 + t), .002)
        inner = (-half + t, half - t)
        # The divider between the compartments, with a thin dark gap along its front.
        box('Divider', white, inner, cab, (split_z - .02, split_z + .01), .002)
        box('Divider gap', grey, inner, (y_front, y_front + .004), (split_z - .004, split_z + .002), .0005)
        # The freezer: two rows of vent slots in the roof, the blue-ringed fan on the back wall, the light bar and shelf under it, the movable ice maker at the lower left.
        for index in range(6):
            x = -.2 + index * .08
            box(f'Vent {index}', grey, (x - .025, x + .025), (y_back - .12, y_back - .09), (height - t - .0005, height - t + .0005), .0003)
            box(f'Vent back {index}', grey, (x - .025, x + .025), (y_back - .0005, y_back + .0005), (height - .06, height - .05), .0003)
        for z, radius in ((height - .12, .055), (split_z - .15, .052)):
            bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=radius + .01, depth=.006, location=(0, y_back - .003, z))
            ring = bpy.context.object
            ring.name = 'Fan ring'
            ring.rotation_euler = (math.pi / 2, 0, 0)
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
            finish(ring, white, 0)
            bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=radius, depth=.008, location=(0, y_back - .006, z))
            obj = bpy.context.object
            obj.name = 'Fan'
            obj.rotation_euler = (math.pi / 2, 0, 0)
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
            finish(obj, fan, 0)
        box('Light shelf', clear, inner, (y_front + .03, y_back - .02), (split_z + .17, split_z + .182), .002)
        box('Light bar', light, inner, (y_front + .03, y_front + .05), (split_z + .165, split_z + .182), .001)
        box('Ice maker', white, (-half + .045, -half + .2), (y_front + .05, y_front + .3), (split_z + .02, split_z + .15), .006)
        box('Ice maker front', clear, (-half + .05, -half + .195), (y_front + .04, y_front + .052), (split_z + .035, split_z + .1), .001)
        box('Ice maker label', grey, (-half + .06, -half + .185), (y_front + .036, y_front + .04), (split_z + .06, split_z + .075), .0005)
        # The fridge: the icon panel under the divider, the filter and fan panel, three glass shelves with white front rails and side brackets, the vegetable drawer.
        box('Icon panel', white, (-.15, .15), (y_front + .04, y_back), (split_z - .1, split_z - .02), .003)
        box('Filter panel', white, (-.07, .07), (y_back - .02, y_back), (split_z - .42, split_z - .22), .002)
        for z in (split_z - .14, split_z - .44, split_z - .74):
            box('Glass shelf', clear, inner, (y_front + .02, y_back - .02), (z, z + .008), .002)
            box('Shelf rail', white, inner, (y_front + .005, y_front + .02), (z - .002, z + .03), .003)
            for sx in (-1, 1):
                box('Shelf bracket', white, (sx * (half - t) - .006 if sx > 0 else -half + t, sx * (half - t) if sx > 0 else -half + t + .006), (y_front + .02, y_back - .02), (z - .006, z + .008), .002)
        box('Big Box', clear, (-half + .06, half - .06), (y_front + .02, y_back - .05), (.04 + t + .01, .04 + .3), .004)
        box('Big Box front', white, (-half + .06, half - .06), (y_front + .01, y_front + .03), (.04 + t + .01, .04 + .3), .006)
        box('Big Box label', grey, (-.03, .03), (y_front + .006, y_front + .01), (.04 + t + .17, .04 + t + .2), .0005)
        box('Big Box handle', white, (-.08, .08), (y_front - .002, y_front + .012), (.04 + t + .27, .04 + t + .3), .004)
        for sx in (-1, 1):
            for sy in (-1, 1):
                bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.02, depth=.04, location=(sx * (half - .04), sy * (depth / 2 - .06), .02))
                obj = bpy.context.object
                obj.name = f'Foot {sx} {sy}'
                finish(obj, foot, 0)
    else:
        # A door seen from the room, hinge on the right (+X), lying at the closed position: the steel outside at -Y, the liner inside and the bins behind it. Z = 0 is the door's bottom.
        w = width - .008
        lower = part == 'lower-door'
        z_base = .05 if lower else split_z + .0035
        h = (split_z - .0035 - .05) if lower else height - z_base
        box('Steel', steel, (-w / 2, w / 2), (-door, -door + .02), (0, h), .004)
        box('Liner', white, (-w / 2, w / 2), (-door + .02, 0), (0, h), .003)
        if lower:
            box('Handle slot', black, (-w / 2 + .056, w / 2 - .056), (-door - .004, -door + .02), (split_z - .09 - z_base, split_z - .015 - z_base), .003)
            box('Handle lip', steel, (-w / 2 + .056, w / 2 - .056), (-door - .006, -door), (split_z - .015 - z_base, split_z - .004 - z_base), .002)
            box('Dispenser', black, (-.085, .085), (-door - .004, -door + .02), (.61 - z_base, .89 - z_base), .004)
            box('Dispenser tray', glass, (-.05, .05), (-door - .006, -door + .01), (.64 - z_base, .78 - z_base), .004)
            box('Dispenser header', black, (-.085, .085), (-door - .006, -door + .02), (.845 - z_base, .89 - z_base), .002)
            bin_('Top', -w / 2 + .03, w / 2 - .03, 0, split_z - .26 - z_base, .1, .1)
            for z in (.24, .62, .99):
                bin_(f'Door {z}', -w / 2 + .03, w / 2 - .03, 0, z - z_base, .08)
        else:
            box('Display', black, (-.028, .028), (-door - .002, -door), (height - .2 - z_base, height - .12 - z_base), .002)
            box('Display light', blue, (-.018, .018), (-door - .0035, -door - .002), (height - .175 - z_base, height - .15 - z_base), .001)
            box('Brand', black, (.19, .27), (-door - .001, -door), (height - .045 - z_base, height - .037 - z_base), .0005)
            for z in (.06, .22):
                bin_(f'Door {z}', -w / 2 + .03, w / 2 - .03, 0, z, .08)

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
        'recipe': 'fridge', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
