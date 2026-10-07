"""The living's gas fireplace, from the owner's picture (a Kamin box): a black steel base, a grey band, an open firebox with slotted side panels, ceramic logs on a burner with a zig-zag grate,
a second grey band, a black upper box with the maker's name, and a cedar top that overhangs it. Units in metres; 990 mm wide at the top (950 mm the body), 400 mm deep, 850 mm tall.

Axes in Blender: X is the width, Y the depth (the open front is -Y, which the exporter turns into +Z; the back is against the wall) and Z the height; it stands on the floor at Z = 0, centred.
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
        shader.inputs['Emission Strength'].default_value = 3
    return item


def build(request, _default_material):
    import bpy
    from mathutils import Vector

    black = paint(bpy, 'Black steel', '#17171a', .55, .35)
    inner = paint(bpy, 'Firebox', '#0b0b0c', .7)
    band = paint(bpy, 'Grey band', '#3b3c3f', .5, .5)
    cedar = paint(bpy, 'Cedar', '#b8693a', .5)
    log = paint(bpy, 'Log', '#8a7566', .85)
    bark = paint(bpy, 'Bark', '#6d5b4d', .9)
    cut = paint(bpy, 'Log end', '#c9a37a', .8)
    grate = paint(bpy, 'Grate', '#101012', .6, .4)
    lamp = paint(bpy, 'Lamp', '#fff4e0', .3, emission=(1, .9, .7))
    parts = []

    def finish(obj, finish_material, bevel=0, smooth=True):
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
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
        size = min(x[1] - x[0], y[1] - y[0], z[1] - z[0])
        finish(obj, finish_material, min(bevel, size / 3) if size > .003 else 0, False)

    def bar(name, finish_material, a, b, thickness):
        """A flat bar between two points in the X-Z plane (the grate's zig-zag), `thickness` deep in Y and 12 mm tall in the cross-section."""
        dx, dz = b[0] - a[0], b[1] - a[1]
        length = math.hypot(dx, dz)
        bpy.ops.mesh.primitive_cube_add(size=1, location=((a[0] + b[0]) / 2, a[2], (a[1] + b[1]) / 2))
        obj = bpy.context.object
        obj.name = name
        obj.dimensions = (length, thickness, .012)
        obj.rotation_euler = (0, -math.atan2(dz, dx), 0)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        finish(obj, finish_material, 0, False)

    def piece(name, finish_material, centre, radius, length, tilt=(0, 0, 0), squash=1.0):
        """A log: a rough cylinder along X (rotated by `tilt`), its two ends in the lighter wood."""
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=radius, depth=length, location=centre)
        obj = bpy.context.object
        obj.name = name
        obj.rotation_euler = (tilt[0], math.pi / 2 + tilt[1], tilt[2])
        obj.scale = (1, squash, 1)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        finish(obj, log, .004)
        for polygon in obj.data.polygons:
            if len(polygon.vertices) == 16:
                polygon.material_index = 1
        obj.data.materials.append(cut)

    w, d = .95, .38
    half, back, front = w / 2, d / 2, -d / 2
    # Bottom to top: the base, the lower band, the firebox, the upper band, the black box and the cedar top.
    base_h, lower_band, fire_h, upper_band, box_h, top_h = .17, .05, .32, .05, .21, .04
    z_lower = base_h
    z_fire = z_lower + lower_band
    z_upper = z_fire + fire_h
    z_box = z_upper + upper_band
    z_top = z_box + box_h
    box('Base', black, (-half + .03, half - .03), (front + .02, back), (0, base_h), .004)
    box('Lower band', band, (-half - .005, half + .005), (front - .01, back), (z_lower, z_lower + lower_band), .004)
    # The firebox: two side panels (with a column of slits), the back and the roof, open at the front.
    box('Panel left', black, (-half + .005, -half + .02), (front + .01, back), (z_fire, z_upper), .002)
    box('Panel right', black, (half - .02, half - .005), (front + .01, back), (z_fire, z_upper), .002)
    box('Back', inner, (-half + .02, half - .02), (back - .02, back), (z_fire, z_upper), .002)
    box('Floor', inner, (-half + .02, half - .02), (front + .02, back), (z_fire, z_fire + .012), .002)
    for side in (-1, 1):
        for index in range(5):
            x = side * (half - .0125)
            box(f'Slit {side} {index}', inner, (x - .008, x + .008), (back - .12 + index * .0, back - .02), (z_fire + .07 + index * .045, z_fire + .075 + index * .045), .0005)
    box('Upper band', band, (-half - .005, half + .005), (front - .01, back), (z_upper, z_upper + upper_band), .004)
    box('Upper box', black, (-half + .005, half - .005), (front + .01, back), (z_box, z_top), .004)
    box('Name plate', band, (half - .22, half - .1), (front + .005, front + .011), (z_box + .06, z_box + .1), .001)
    box('Top', cedar, (-half - .02, half + .02), (front - .02, back), (z_top, z_top + top_h), .008)
    # The burner: a low frame with a zig-zag grate of mountain peaks, two small lamps, and the ceramic logs on it.
    fy = front + .1
    box('Burner', grate, (-.2, .2), (fy - .06, fy + .06), (z_fire + .012, z_fire + .045), .003)
    peaks = [(-.2, z_fire + .045), (-.14, z_fire + .15), (-.08, z_fire + .075), (-.02, z_fire + .17), (.04, z_fire + .075), (.1, z_fire + .15), (.16, z_fire + .075), (.2, z_fire + .045)]
    for index in range(len(peaks) - 1):
        a, b = peaks[index], peaks[index + 1]
        bar(f'Grate {index}', grate, (a[0], a[1], fy - .05), (b[0], b[1], fy - .05), .012)
    for x in (-.22, .22):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=.012, location=(x, fy - .02, z_fire + .16))
        obj = bpy.context.object
        obj.name = 'Lamp'
        finish(obj, lamp, 0)
    z0 = z_fire + .08
    piece('Log 1', log, (-.04, fy + .02, z0 + .02), .035, .3, (0, .06, .1))
    piece('Log 2', log, (.06, fy + .05, z0 + .06), .03, .26, (0, -.28, -.08))
    piece('Log 3', log, (-.08, fy + .06, z0 + .1), .028, .22, (0, .5, .15))
    piece('Log 4', log, (.1, fy - .005, z0 + .02), .026, .2, (0, -.1, .3))
    piece('Log 5', bark, (0, fy + .08, z0 + .13), .024, .2, (0, .2, -.2))

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
        'recipe': 'fireplace', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
